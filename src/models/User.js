import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - passwordHash
 *         - name
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user
 *         username:
 *           type: string
 *           description: Unique username for login
 *         passwordHash:
 *           type: string
 *           description: Hashed password
 *         name:
 *           type: string
 *           description: User's full name
 *         role:
 *           type: string
 *           description: User role for access control
 *           enum: [admin, sales, delivery]
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when user was last updated
 *       example:
 *         _id: 607c2c3a1286781f9876b271
 *         username: admin
 *         passwordHash: $2a$10$8NJQhsJ7kJ/j6c2j3jRcqeDC7k/XsPC6zPyIq0YuQK4O7lZE3kSk.
 *         name: Admin User
 *         role: admin
 *         createdAt: 2023-05-10T12:00:00.000Z
 *         updatedAt: 2023-05-10T12:00:00.000Z
 */
const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      default: 'customer',
      enum: ['admin', 'sales', 'customer'],
    },
  },
  {
    timestamps: true,
  }
);

// Compare entered password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    next();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

const User = mongoose.model('User', userSchema);

export default User; 