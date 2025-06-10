"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
class User extends sequelize_1.Model {
    static initialize(sequelize, dataTypes) {
        return super.init({
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Name is required',
                    },
                    len: {
                        args: [2, 100],
                        msg: 'Name must be between 2 and 100 characters',
                    },
                },
            },
            email: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: {
                        msg: 'Please provide a valid email address',
                    },
                    notEmpty: {
                        msg: 'Email is required',
                    },
                },
            },
            password: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Password is required',
                    },
                    len: {
                        args: [8, 100],
                        msg: 'Password must be at least 8 characters long',
                    },
                },
            },
            resetPasswordToken: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            resetPasswordExpires: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            emailVerificationToken: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
            },
            emailVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
            },
            lastLogin: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            loginAttempts: {
                type: sequelize_1.DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            lockUntil: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
                defaultValue: 'pending',
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: 'User',
            tableName: 'users',
            paranoid: true,
            timestamps: true,
            defaultScope: {
                attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires', 'emailVerificationToken'] },
            },
            scopes: {
                withPassword: {
                    attributes: { include: ['password'] },
                },
                withTokens: {
                    attributes: { include: ['resetPasswordToken', 'resetPasswordExpires', 'emailVerificationToken'] },
                },
            },
        });
    }
    static associate(models) {
        User.hasMany(models.Project, {
            foreignKey: 'createdById',
            as: 'createdProjects',
        });
        User.belongsToMany(models.Project, {
            through: models.ProjectMember,
            as: 'projects',
            foreignKey: 'userId',
        });
        User.hasMany(models.ProjectMember, {
            foreignKey: 'userId',
            as: 'projectMembers',
        });
    }
}
exports.User = User;
exports.default = User;
