import type { RequestHandler } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { UserRole } from '../user/user.entity.js';
import { JobRepository } from './job.repository.js';

const jobRepo = new JobRepository();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stringField = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
};

export const listJobs: RequestHandler = async (_req, res, next) => {
  try {
    const jobs = await jobRepo.findOpen();
    res.json({ success: true, data: { jobs } });
  } catch (error) {
    next(error);
  }
};

export const ingestJobs: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as unknown;
    const items = Array.isArray(body) ? body : [body];
    const records = items.map(asRecord).filter((item) => item !== null);

    if (records.length === 0) {
      throw new AppError(400, 'Request body must be a JSON object or an array of JSON objects');
    }

    const saved = [];
    for (const record of records) {
      const job = await jobRepo.create({
        title: stringField(record, 'title') ?? 'Untitled role',
        company: stringField(record, 'company') ?? stringField(record, 'companyName') ?? 'Unknown company',
        location: stringField(record, 'location'),
        description: stringField(record, 'description'),
        status: stringField(record, 'status') ?? 'open',
        source: 'python',
        metadata: record,
      });
      saved.push(job.id);
    }

    res.status(201).json({ success: true, data: { saved: saved.length, ids: saved } });
  } catch (error) {
    next(error);
  }
};

export const deleteJob: RequestHandler = async (req, res, next) => {
  try {
    const job = await jobRepo.findById(req.params.id as string);
    if (!job || job.isDeleted) {
      throw new AppError(404, 'Job not found');
    }
    await jobRepo.softDelete(job.id);
    res.json({ success: true, data: { message: 'Job removed' } });
  } catch (error) {
    next(error);
  }
};


/** Recruiter-created job posts ---------------------------------------------
 * Company always comes from the authenticated recruiter's profile, never
 * from the request body. Extra form fields ride along in `metadata`. */
export const createJob: RequestHandler = async (req, res, next) => {
  try {
    const body = asRecord(req.body);
    if (!body) {
      throw new AppError(400, 'Request body must be a JSON object');
    }
    const title = stringField(body, 'title');
    if (!title) {
      throw new AppError(400, 'Job title is required');
    }
    const recruiter = req.user!;
    const company =
      recruiter.companyName?.trim() ||
      recruiter.name?.trim() ||
      recruiter.email ||
      'Unknown company';
    const job = await jobRepo.create({
      title,
      company,
      location: stringField(body, 'location'),
      description: stringField(body, 'description'),
      status: 'open',
      source: 'recruiter',
      metadata: {
        department: stringField(body, 'department'),
        employmentType: stringField(body, 'employmentType'),
        salary: stringField(body, 'salary'),
        minimumQualifications: stringField(body, 'minimumQualifications'),
        preferredQualifications: stringField(body, 'preferredQualifications'),
      },
      postedBy: recruiter.userId,
    });
    res.status(201).json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

export const listMyJobs: RequestHandler = async (req, res, next) => {
  try {
    const jobs = await jobRepo.findByPostedBy(req.user!.userId);
    res.json({ success: true, data: { jobs } });
  } catch (error) {
    next(error);
  }
};

export const updateJobStatus: RequestHandler = async (req, res, next) => {
  try {
    const status = stringField(asRecord(req.body) ?? {}, 'status');
    if (!status || !['open', 'paused', 'closed'].includes(status)) {
      throw new AppError(400, 'Status must be open, paused or closed');
    }
    const job = await jobRepo.findById(req.params.id as string);
    if (!job || job.isDeleted) {
      throw new AppError(404, 'Job not found');
    }
    const user = req.user!;
    const isOwner = job.postedBy === user.userId;
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
    if (!isOwner && !isAdmin) {
      throw new AppError(403, 'You can only manage your own job posts');
    }
    const updated = await jobRepo.updateStatus(job.id, status);
    res.json({ success: true, data: { job: updated } });
  } catch (error) {
    next(error);
  }
};
