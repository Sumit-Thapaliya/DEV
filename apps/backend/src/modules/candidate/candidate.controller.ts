import type { RequestHandler } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { UserRole } from '../user/user.entity.js';
import { UserRepository } from '../user/user.repository.js';
import { toSafeUser } from '../auth/auth.service.js';

const userRepo = new UserRepository();

export const listCandidates: RequestHandler = async (_req, res, next) => {
  try {
    const candidates = await userRepo.findByRole(UserRole.CANDIDATE);
    res.json({
      success: true,
      data: { candidates: candidates.map(toSafeUser) },
    });
  } catch (error) {
    next(error);
  }
};

export const getCandidate: RequestHandler = async (req, res, next) => {
  try {
    const user = await userRepo.findById(req.params.id as string);
    if (!user || user.isDeleted || user.role !== UserRole.CANDIDATE) {
      throw new AppError(404, 'Candidate not found');
    }
    res.json({ success: true, data: { candidate: toSafeUser(user) } });
  } catch (error) {
    next(error);
  }
};

export const softDeleteCandidate: RequestHandler = async (req, res, next) => {
  try {
    const user = await userRepo.findById(req.params.id as string);
    if (!user || user.isDeleted || user.role !== UserRole.CANDIDATE) {
      throw new AppError(404, 'Candidate not found');
    }
    if (req.user?.userId === user.userId) {
      throw new AppError(409, 'You cannot delete your own account here');
    }
    await userRepo.update(user.userId, { isDeleted: true });
    res.json({ success: true, data: { message: 'Candidate deleted' } });
  } catch (error) {
    next(error);
  }
};
