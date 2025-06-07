# 🛠️ Contributing to StarkHive API

Thank you for your interest in contributing to **StarkHive** — a decentralized job marketplace built on Starknet.

This repository (`starkhive_api`) is the backend powering authentication, job listings, post feeds, and user profiles. Whether you're fixing bugs, building new features, or improving documentation, your help is appreciated!


## 🚀 Getting Started

1. **Fork** the repo and **clone** your fork:
   ```
   git clone https://github.com/your-username/starkhive_api.git
   cd starkhive_api
   ```

2. Create a new branch for your changes:
   ```
   git checkout -b your-feature-name
   ```

3. Make your changes and test them thoroughly.

4. Commit and push:
   ```
   git commit -m "Your clear, concise commit message"
   git push origin your-feature-name
   ```

5. Open a **Pull Request** with a detailed description.



## ✅ Contribution Guidelines

* Follow existing code style and conventions.
* Keep commits clean and descriptive.
* Write clear and concise documentation/comments where necessary.
* If your contribution adds new functionality, include appropriate tests.
* Ensure all changes pass linting and do not break existing tests.


## 🔐 Role-Based Access Control (RBAC)

This project uses role-based access control to secure endpoints for different user types: `Recruiter`, `Freelancer`, and `Admin`.

### How to Protect Endpoints

1. **Import Decorator and Guard:**
   ```typescript
   import { Roles } from '../auth/decorators/role.decorator';
   import { RolesGuard } from '../auth/guards/role.guard';
   import { JwtAuthGuard } from '../auth/guards/jwt.strategy';
   import { UserRole } from '../auth/enums/userRole.enum';
   ```
2. **Apply to Controller Methods:**
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles(UserRole.ADMIN)
   @Get('admin-only')
   getAdminData() {
     // ...
   }
   ```
3. **Multiple Roles:**
   ```typescript
   @Roles(UserRole.RECRUITER, UserRole.ADMIN)
   ```

- The user's role is stored in the `role` field of the `User` entity.
- Unauthorized access is blocked automatically by the guard.

### Best Practices
- Always use `@Roles` and `RolesGuard` for sensitive or restricted endpoints.
- Add clear comments when a route is protected by RBAC.
- Review and update roles as new features and user types are added.


## 📢 Join the Community

To stay connected and up-to-date:

* **Join our Telegram community**: https://t.me/+eaLauxwU1oA3OGJk
* Ask questions, suggest features, and collaborate in real-time.
* **Star this repo** to support the project and help others discover it ⭐



## 🙌 Thank You!

We're building StarkHive together. Your contributions — big or small — make this project stronger for the Web3 dev community.

