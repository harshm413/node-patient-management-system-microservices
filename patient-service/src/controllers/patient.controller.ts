import { Router, Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { PatientService } from '../services/patient.service';
import {
  createPatientValidation,
  updatePatientValidation,
} from '../utils/validators';

export function createPatientRouter(patientService: PatientService): Router {
  const router = Router();

  /**
   * @openapi
   * /patients:
   *   get:
   *     summary: Get Patients
   *     tags:
   *       - Patient
   *     responses:
   *       200:
   *         description: List of patients
   */
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const patients = await patientService.getPatients();
      res.status(200).json(patients);
    } catch (err) {
      next(err);
    }
  });

  /**
   * @openapi
   * /patients:
   *   post:
   *     summary: Create a new Patient
   *     tags:
   *       - Patient
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *               address:
   *                 type: string
   *               dateOfBirth:
   *                 type: string
   *               registeredDate:
   *                 type: string
   *     responses:
   *       200:
   *         description: Patient created
   *       400:
   *         description: Validation error
   */
  router.post(
    '/',
    createPatientValidation,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const fieldErrors: Record<string, string> = {};
          for (const err of errors.array()) {
            if (err.type === 'field' && !fieldErrors[err.path]) {
              fieldErrors[err.path] = err.msg;
            }
          }
          res.status(400).json(fieldErrors);
          return;
        }

        const patient = await patientService.createPatient(req.body);
        res.status(200).json(patient);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * @openapi
   * /patients/{id}:
   *   put:
   *     summary: Update a new Patient
   *     tags:
   *       - Patient
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *               address:
   *                 type: string
   *               dateOfBirth:
   *                 type: string
   *     responses:
   *       200:
   *         description: Patient updated
   *       400:
   *         description: Validation error
   */
  router.put(
    '/:id',
    updatePatientValidation,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const fieldErrors: Record<string, string> = {};
          for (const err of errors.array()) {
            if (err.type === 'field' && !fieldErrors[err.path]) {
              fieldErrors[err.path] = err.msg;
            }
          }
          res.status(400).json(fieldErrors);
          return;
        }

        const patient = await patientService.updatePatient(
          req.params.id as string,
          req.body
        );
        res.status(200).json(patient);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * @openapi
   * /patients/{id}:
   *   delete:
   *     summary: Delete a Patient
   *     tags:
   *       - Patient
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Patient deleted
   */
  router.delete(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await patientService.deletePatient(req.params.id as string);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
