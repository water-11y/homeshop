import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersUploadRoot = path.resolve(__dirname, '..', 'uploads', 'users');
const uploadDirs = {
  facePhoto: path.join(usersUploadRoot, 'faces'),
  attachments: path.join(usersUploadRoot, 'attachments')
};

Object.values(uploadDirs).forEach((directory) => {
  fs.mkdirSync(directory, { recursive: true });
});

const safeFileName = (fileName) => {
  return fileName.replace(/[^\w.\-가-힣]/g, '_');
};

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDirs[file.fieldname] || uploadDirs.attachments);
  },
  filename(req, file, callback) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${unique}-${safeFileName(file.originalname)}`);
  }
});

const allowedAttachmentTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/haansofthwp',
  'application/x-hwp',
  'application/octet-stream',
  'text/plain'
]);

const fileFilter = (req, file, callback) => {
  if (file.fieldname === 'facePhoto') {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
      return;
    }

    callback(new Error('얼굴 사진은 이미지 파일만 첨부할 수 있습니다.'));
    return;
  }

  if (file.fieldname === 'attachments') {
    if (file.mimetype.startsWith('image/') || allowedAttachmentTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error('추가 첨부파일은 이미지 또는 문서 파일만 첨부할 수 있습니다.'));
    return;
  }

  callback(new Error('지원하지 않는 업로드 항목입니다.'));
};

export const registerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 11
  }
}).fields([
  { name: 'facePhoto', maxCount: 1 },
  { name: 'attachments', maxCount: 10 }
]);
