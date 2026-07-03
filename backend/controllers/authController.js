import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
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

export const register = async (req, res, next) => {
  let connection;

  try {
    const { username, password, name, email } = req.body;
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
      'INSERT INTO users (username, password, name, email, role, approval_status, face_photo_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, email, role, approvalStatus, facePhotoPath]
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
