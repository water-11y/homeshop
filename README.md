# HomeShop

React + Express + MySQL 기반의 홈쇼핑 시작 프로젝트입니다.

## 포함 기능

- 회원가입, 로그인, 로그아웃, 로그인 상태 유지
- 첫 화면 로그인 고정
- 관리자 승인 전 사용자 로그인 차단
- 상품 목록, 상품 검색, 카테고리 필터, 정렬
- 상품 상세 페이지
- 리뷰/평점 작성, 수정, 삭제
- 상품별 평균 평점 및 평점 분포 자동 반영
- 장바구니 담기, 수량 변경, 삭제
- 주문/배송 정보 입력 및 주문 생성
- 내 주문내역 조회
- 관리자 상품 등록
- 관리자 사용자 승인/거절 및 관리자 권한 부여
- 관리자 리뷰 노출/숨김 관리
- 관리자 주문 상태 변경 API

## 폴더 구조

- `frontend`: React 화면
- `backend`: Express API 서버
- `backend/database/schema.sql`: MySQL 테이블 생성 및 샘플 상품 SQL

## 1. DB 준비

MySQL Workbench 또는 MySQL 콘솔에서 실행합니다.

```sql
CREATE DATABASE IF NOT EXISTS my_homepage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE my_homepage;
SOURCE D:/login/backend/database/schema.sql;
```

Workbench에서는 `backend/database/schema.sql` 내용을 직접 붙여넣어 실행해도 됩니다.

이미 `users` 테이블만 만들었던 상태라면, 같은 `schema.sql`을 다시 실행하세요. `products`, `orders`, `order_items` 테이블과 샘플 상품이 추가됩니다.

리뷰 기능 업데이트 후에도 같은 파일을 다시 실행하세요. `reviews` 테이블이 추가됩니다.

## 2. 백엔드 실행

```powershell
cd D:\login\backend
copy .env.example .env
npm install
npm run dev
```

`.env` 예시:

```env
PORT=5001
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=my_homepage

JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=1d
```

프론트엔드가 `5174`로 뜨면 `CLIENT_ORIGIN=http://localhost:5174`로 바꾸고 백엔드를 재시작하세요.

## 3. 프론트엔드 실행

새 터미널에서 실행합니다.

```powershell
cd D:\login\frontend
copy .env.example .env
npm install
npm run dev
```

`.env` 예시:

```env
VITE_API_URL=http://localhost:5001/api
```

터미널의 `Local:` 주소로 접속합니다.

## 4. 관리자 계정 만들기

새 DB에서 처음 가입하는 계정은 자동으로 `admin`, `approved`가 됩니다.

이미 일반 회원을 먼저 만든 상태라면 MySQL에서 해당 계정을 관리자 권한으로 바꿀 수 있습니다.

```sql
UPDATE users
SET role = 'admin', approval_status = 'approved'
WHERE username = '관리자로_쓸_아이디';
```

다시 로그인하면 `User Approval`, `Products`, `Orders` 관리자 메뉴가 보입니다.

일반 회원은 회원가입 직후 `pending` 상태입니다. 관리자가 `User Approval` 화면에서 `Approve`를 눌러야 로그인할 수 있습니다.

## 주요 API

- `POST /api/auth/register`: 회원가입
- `POST /api/auth/login`: 로그인
- `GET /api/auth/me`: 로그인 사용자 조회
- `GET /api/products`: 상품 목록
- `GET /api/products/categories`: 카테고리 목록
- `GET /api/products/:id`: 상품 상세
- `GET /api/products/:id/reviews`: 상품 리뷰 목록 및 평점 분포
- `POST /api/products/:id/reviews`: 리뷰 작성 또는 내 리뷰 덮어쓰기
- `PUT /api/products/reviews/:reviewId`: 리뷰 수정
- `DELETE /api/products/reviews/:reviewId`: 리뷰 삭제
- `POST /api/products`: 관리자 상품 등록
- `POST /api/orders`: 주문 생성
- `GET /api/orders/my`: 내 주문내역
- `GET /api/orders/admin`: 관리자 전체 주문 조회
- `GET /api/admin/users`: 관리자 사용자 목록
- `PATCH /api/admin/users/:id/approval`: 사용자 승인 상태 변경
- `PATCH /api/admin/users/:id/role`: 사용자 권한 변경
- `GET /api/admin/reviews`: 관리자 리뷰 목록
- `PATCH /api/admin/reviews/:reviewId/visibility`: 리뷰 노출/숨김
