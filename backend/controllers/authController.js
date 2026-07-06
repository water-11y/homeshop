import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { pool } from '../config/db.js';

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  email: user.email,
  role: user.role,
  approval_status: user.approval_status,
  face_photo_path: user.face_photo_path,
  created_at: user.created_at
});

const uploadedFiles = (files = {}) => Object.values(files).flat();

const removeUploadedFiles = async (files = {}) => {
  await Promise.allSettled(uploadedFiles(files).map((file) => fs.unlink(file.path)));
};

const uploadPathFor = (file, folder) => `/uploads/users/${folder}/${file.filename}`;

const isTruthy = (value) => {
  return value === true || value === 'true' || value === '1' || value === 1 || value === 'on';
};

const maskUsername = (username) => {
  const value = String(username || '');
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, -4)}${'*'.repeat(4)}`;
};

const makeTemporaryPassword = () => String(Math.floor(10000000 + Math.random() * 90000000));

const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY);

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const sendTemporaryPasswordWithResend = async ({ to, name, temporaryPassword }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'HomeShop <onboarding@resend.dev>',
      to,
      subject: '[HomeShop] Temporary password',
      text: `Hello ${name}, your temporary password is ${temporaryPassword}. Please log in and change your password.`
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.message || `Resend API failed with status ${response.status}`);
    err.status = 502;
    throw err;
  }

  return { sent: true, provider: 'resend', id: data.id };
};

const smtpErrorMessage = (err) => {
  if (err?.code === 'EAUTH') {
    return 'Gmail SMTP 인증에 실패했습니다. SMTP_USER와 Google 앱 비밀번호를 확인해주세요.';
  }

  if (err?.code === 'ETIMEDOUT' || err?.code === 'ESOCKET' || err?.code === 'ECONNECTION') {
    return 'SMTP 연결 시간이 초과되었습니다. Railway 변수와 Gmail SMTP 설정을 확인해주세요.';
  }

  return `SMTP 발송 실패: ${err.message || '알 수 없는 오류'}`;
};

const sendTemporaryPasswordMail = async ({ to, name, temporaryPassword }) => {
  if (hasResendConfig()) {
    return sendTemporaryPasswordWithResend({ to, name, temporaryPassword });
  }

  if (!hasSmtpConfig()) {
    console.info(`[DEV PASSWORD RESET] ${to}: ${temporaryPassword}`);
    return { sent: false, developmentPassword: temporaryPassword };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 12000
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: '[HomeShop] 임시 비밀번호 안내',
      text: `${name}님, 임시 비밀번호는 ${temporaryPassword} 입니다. 로그인 후 개인정보 수정에서 비밀번호를 변경해주세요.`
    });
  } catch (err) {
    err.status = 502;
    err.message = smtpErrorMessage(err);
    throw err;
  }

  return { sent: true };
};

export const register = async (req, res, next) => {
  let connection;

  try {
    const {
      username,
      password,
      name,
      email,
      terms_agreed,
      privacy_agreed,
      email_marketing_consent = false,
      sns_marketing_consent = false
    } = req.body;
    const facePhoto = req.files?.facePhoto?.[0] || null;
    const attachments = req.files?.attachments || [];

    if (!username || !password || !name || !email) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ message: '필수 정보를 모두 입력해주세요.' });
    }

    if (password.length < 8) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
    }

    if (!isTruthy(terms_agreed) || !isTruthy(privacy_agreed)) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ message: '필수 약관과 개인정보 수집 및 이용에 동의해주세요.' });
    }

    if (!facePhoto) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ message: '얼굴 사진 1장을 첨부해주세요.' });
    }

    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    if (existingUsers.length > 0) {
      await removeUploadedFiles(req.files);
      return res.status(409).json({ message: '이미 사용 중인 아이디 또는 이메일입니다.' });
    }

    const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const isFirstUser = Number(countRow.total) === 0;
    const role = isFirstUser ? 'admin' : 'user';
    const approvalStatus = isFirstUser ? 'approved' : 'pending';
    const hashedPassword = await bcrypt.hash(password, 12);
    const facePhotoPath = uploadPathFor(facePhoto, 'faces');

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO users
        (username, password, name, email, role, approval_status, face_photo_path,
         terms_agreed_at, privacy_agreed_at, email_marketing_consent, sns_marketing_consent)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`,
      [
        username,
        hashedPassword,
        name,
        email,
        role,
        approvalStatus,
        facePhotoPath,
        isTruthy(email_marketing_consent) ? 1 : 0,
        isTruthy(sns_marketing_consent) ? 1 : 0
      ]
    );

    for (const file of attachments) {
      await connection.query(
        'INSERT INTO user_attachments (user_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, file.originalname, uploadPathFor(file, 'attachments'), file.mimetype, file.size]
      );
    }

    const [createdRows] = await connection.query(
      'SELECT id, username, name, email, role, approval_status, face_photo_path, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    await connection.commit();

    res.status(201).json({
      message: isFirstUser
        ? '관리자 계정이 생성되었습니다. 바로 로그인할 수 있습니다.'
        : '회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.',
      user: publicUser(createdRows[0])
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    await removeUploadedFiles(req.files);
    next(err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '아이디와 비밀번호를 입력해주세요.' });
    }

    const [users] = await pool.query(
      'SELECT id, username, password, name, email, role, approval_status, face_photo_path, created_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = users[0];

    if (user.role !== 'admin' && user.approval_status !== 'approved') {
      return res.status(403).json({ message: '관리자 승인 대기 중인 계정입니다.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    res.json({
      message: '로그인되었습니다.',
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (err) {
    next(err);
  }
};

export const findUsername = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: '이름과 이메일을 입력해주세요.' });
    }

    const [users] = await pool.query(
      'SELECT username FROM users WHERE name = ? AND email = ? LIMIT 1',
      [name, email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '일치하는 계정을 찾을 수 없습니다.' });
    }

    res.json({ message: '아이디를 찾았습니다.', username: maskUsername(users[0].username) });
  } catch (err) {
    next(err);
  }
};

export const requestPasswordReset = async (req, res, next) => {
  let connection;

  try {
    const { name, email, username } = req.body;

    if (!name || !email || !username) {
      return res.status(400).json({ message: '이름, 이메일, 아이디를 모두 입력해주세요.' });
    }

    const [users] = await pool.query(
      'SELECT id, username, name, email FROM users WHERE name = ? AND email = ? AND username = ? LIMIT 1',
      [name, email, username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '일치하는 계정을 찾을 수 없습니다.' });
    }

    const temporaryPassword = makeTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, users[0].id]);
    const mailResult = await sendTemporaryPasswordMail({
      to: users[0].email,
      name: users[0].name,
      temporaryPassword
    });
    await connection.commit();

    res.json({
      message: mailResult.sent
        ? '임시 비밀번호를 이메일로 발송했습니다.'
        : 'SMTP 설정이 없어 개발용 임시 비밀번호를 표시합니다.',
      sent: mailResult.sent,
      temporary_password: mailResult.developmentPassword
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    next(err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const logout = (req, res) => {
  res.json({ message: '로그아웃되었습니다.' });
};

export const me = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, name, email, role, approval_status, face_photo_path, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user: publicUser(users[0]) });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, current_password = '', new_password = '' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: '이름과 이메일을 입력해주세요.' });
    }

    if (new_password && new_password.length < 8) {
      return res.status(400).json({ message: '새 비밀번호는 8자 이상이어야 합니다.' });
    }

    const [users] = await pool.query(
      'SELECT id, username, password, name, email, role, approval_status, face_photo_path, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const [duplicates] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [email, req.user.id]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    const values = [name, email];
    let passwordSql = '';

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ message: '현재 비밀번호를 입력해주세요.' });
      }

      const isPasswordValid = await bcrypt.compare(current_password, users[0].password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
      }

      passwordSql = ', password = ?';
      values.push(await bcrypt.hash(new_password, 12));
    }

    values.push(req.user.id);
    await pool.query(`UPDATE users SET name = ?, email = ?${passwordSql} WHERE id = ?`, values);

    const [updatedRows] = await pool.query(
      'SELECT id, username, name, email, role, approval_status, face_photo_path, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    res.json({ message: '개인정보가 수정되었습니다.', user: publicUser(updatedRows[0]) });
  } catch (err) {
    next(err);
  }
};

export const deleteMe = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT id, role FROM users WHERE id = ? LIMIT 1', [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    if (users[0].role === 'admin') {
      return res.status(400).json({ message: '관리자 계정은 직접 탈퇴할 수 없습니다. 다른 관리자에게 권한 변경을 요청하세요.' });
    }

    const deletedUsername = `deleted_${req.user.id}_${Date.now()}`;

    await pool.query(
      `UPDATE users
       SET username = ?, name = '탈퇴회원', email = ?, approval_status = 'rejected',
           face_photo_path = NULL, email_marketing_consent = 0, sns_marketing_consent = 0
       WHERE id = ?`,
      [deletedUsername, `${deletedUsername}@deleted.local`, req.user.id]
    );

    await pool.query('DELETE FROM shipping_addresses WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM wishlist_items WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM recently_viewed_products WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);

    res.json({ message: '회원 탈퇴가 처리되었습니다.' });
  } catch (err) {
    next(err);
  }
};
