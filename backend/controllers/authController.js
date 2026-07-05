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

const uploadedFiles = (files = {}) => {
  return Object.values(files).flat();
};

const removeUploadedFiles = async (files = {}) => {
  await Promise.allSettled(
    uploadedFiles(files).map((file) => fs.unlink(file.path))
  );
};

const uploadPathFor = (file, folder) => {
  return `/uploads/users/${folder}/${file.filename}`;
};

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

const makeTemporaryPassword = () => {
  const numbers = Math.floor(10000000 + Math.random() * 90000000);
  return String(numbers);
};

const hasSmtpConfig = () => {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

const sendTemporaryPasswordMail = async ({ to, name, temporaryPassword }) => {
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
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: '[HomeShop] 임시 비밀번호 안내',
    text: `${name}님, 임시 비밀번호는 ${temporaryPassword} 입니다. 로그인 후 반드시 비밀번호를 변경해주세요.`
  });

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
      return res.status(400).json({ message: 'Please enter all required fields.' });
    }

    if (password.length < 8) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    if (!isTruthy(terms_agreed) || !isTruthy(privacy_agreed)) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ message: '필수 약관과 개인정보 수집 및 이용에 동의해주세요.' });
    }

    if (!facePhoto) {
      await removeUploadedFiles(req.files);
      return res.status(400).json({ message: '얼굴 사진을 1장 첨부해주세요.' });
    }

    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    if (existingUsers.length > 0) {
      await removeUploadedFiles(req.files);
      return res.status(409).json({ message: 'Username or email is already in use.' });
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
        ? 'Admin account created. You can log in now.'
        : 'Registration completed. Please wait for admin approval.',
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
      return res.status(400).json({ message: 'Please enter username and password.' });
    }

    const [users] = await pool.query(
      'SELECT id, username, password, name, email, role, approval_status, face_photo_path, created_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Username or password is incorrect.' });
    }

    const user = users[0];

    if (user.role !== 'admin' && user.approval_status !== 'approved') {
      return res.status(403).json({
        message: 'Your account is waiting for admin approval.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Username or password is incorrect.' });
    }

    const token = signToken(user);

    res.json({
      message: 'Logged in.',
      token,
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

    res.json({
      message: '아이디를 찾았습니다.',
      username: maskUsername(users[0].username)
    });
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
  res.json({ message: 'Logged out.' });
};

export const me = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, name, email, role, approval_status, face_photo_path, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User was not found.' });
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
      return res.status(404).json({ message: 'User was not found.' });
    }

    const [duplicates] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [email, req.user.id]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    const user = users[0];
    const values = [name, email];
    let passwordSql = '';

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ message: '현재 비밀번호를 입력해주세요.' });
      }

      const isPasswordValid = await bcrypt.compare(current_password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
      }

      const hashedPassword = await bcrypt.hash(new_password, 12);
      passwordSql = ', password = ?';
      values.push(hashedPassword);
    }

    values.push(req.user.id);

    await pool.query(
      `UPDATE users SET name = ?, email = ?${passwordSql} WHERE id = ?`,
      values
    );

    const [updatedRows] = await pool.query(
      'SELECT id, username, name, email, role, approval_status, face_photo_path, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    res.json({
      message: '개인정보가 수정되었습니다.',
      user: publicUser(updatedRows[0])
    });
  } catch (err) {
    next(err);
  }
};
