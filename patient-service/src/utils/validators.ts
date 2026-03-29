import { body } from 'express-validator';

export const createPatientValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email should be valid'),
  body('address')
    .notEmpty()
    .withMessage('Address is required'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required'),
  body('registeredDate')
    .notEmpty()
    .withMessage('Registered date is required'),
];

export const updatePatientValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email should be valid'),
  body('address')
    .notEmpty()
    .withMessage('Address is required'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required'),
];
