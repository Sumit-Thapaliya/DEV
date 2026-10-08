import type { RequestHandler } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { UserRole } from '../user/user.entity.js';
import { UserRepository } from '../user/user.repository.js';
import { toSafeUser } from '../auth/auth.service.js';

import { z } from 'zod';
import { AppDataSource } from '../../database/data-source.js';
import { User } from '../user/user.entity.js';
import { ProfileView } from './profile-view.entity.js';

const candidateIdSchema = z.string().uuid('Invalid candidate id');
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
    const user = await userRepo.findById(
      candidateIdSchema.parse(req.params.id),
    );
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
    const user = await userRepo.findById(
      candidateIdSchema.parse(req.params.id),
    );
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

/** Writes use POST and the existing global cookie/Origin/CSRF guards, never GET. */
export const recordProfileView: RequestHandler = async (req, res, next) => {
  try {
    const candidateId = candidateIdSchema.parse(req.params.id);
    const candidate = await userRepo.findById(candidateId);
    if (
      !candidate ||
      candidate.isDeleted ||
      candidate.role !== UserRole.CANDIDATE
    )
      throw new AppError(404, 'Candidate not found');
    const inserted = await AppDataSource.getRepository(ProfileView)
      .createQueryBuilder()
      .insert()
      .values({ recruiterId: req.user!.userId, candidateId })
      .orIgnore()
      .returning('id')
      .execute();
    res.json({
      success: true,
      data: { recorded: true, created: inserted.raw.length > 0 },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfileViews: RequestHandler = async (req, res, next) => {
  try {
    const views = await AppDataSource.getRepository(ProfileView)
      .createQueryBuilder('view')
      .innerJoin(
        User,
        'candidate',
        'candidate.userId = view.candidateId AND candidate.isDeleted = false AND candidate.role = :role',
        { role: UserRole.CANDIDATE },
      )
      .where('view.recruiterId = :recruiterId', {
        recruiterId: req.user!.userId,
      })
      .select([
        'view.id AS "id"',
        'view.createdAt AS "viewedAt"',
        'candidate.userId AS "candidateId"',
        'candidate.name AS "candidateName"',
        'candidate.email AS "candidateEmail"',
      ])
      .orderBy('view.createdAt', 'DESC')
      .addOrderBy('view.id', 'DESC')
      .getRawMany();
    res.json({ success: true, data: { totalViews: views.length, views } });
  } catch (error) {
    next(error);
  }
};

export const getOwnProfileViews: RequestHandler = async (req, res, next) => {
  try {
    const totalViews = await AppDataSource.getRepository(ProfileView)
      .createQueryBuilder('view')
      .innerJoin(
        User,
        'recruiter',
        'recruiter.userId = view.recruiterId AND recruiter.isDeleted = false AND recruiter.role = :role',
        { role: UserRole.RECRUITER },
      )
      .where('view.candidateId = :candidateId', {
        candidateId: req.user!.userId,
      })
      .getCount();
    res.json({ success: true, data: { totalViews } });
  } catch (error) {
    next(error);
  }
};
