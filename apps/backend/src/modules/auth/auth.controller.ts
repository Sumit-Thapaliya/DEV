import { SearchHistory } from '../user/search-history.entity.js';
import { AppDataSource } from '../../database/data-source.js';
import { User } from '../user/user.entity.js';
import type { RequestHandler } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import {
  AuthService,
  COOKIE_NAME,
  cookieOptions,
  signSession,
  toSafeUser,
} from './auth.service.js';

const authService = new AuthService();

export const register: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: { requiresOtp: true, identifier: user.email ?? user.mobile },
    });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.startLogin(req.body);
    res.json({
      success: true,
      data: { requiresOtp: true, identifier: result.identifier },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.verifyOtp(req.body);
    res
      .cookie(COOKIE_NAME, signSession(user), cookieOptions())
      .json({
        success: true,
        data: { user: toSafeUser(user), token: signSession(user) },
      });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser: RequestHandler = async (req, res) => {
  res.json({ success: true, data: { user: toSafeUser(req.user!) } });
};


import { ResumeVersion } from '../user/resume-version.entity.js';

export const formatResumeProxy: RequestHandler = async (req, res, next) => {
  try {
    if (req.user!.role.toLowerCase() !== 'candidate') {
      throw new AppError(403, 'Only candidates can format a resume');
    }
    const { fileName, dataBase64 } = req.body;
    
    // Convert base64 to Blob
    const buffer = Buffer.from(dataBase64, 'base64');
    const blob = new Blob([buffer], { type: 'application/pdf' });
    
    // Create FormData for Python API
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('max_pages', '2');
    
    // Proxy to Python API
    const ATS_ENDPOINT = process.env.ATS_ENDPOINT || 'https://ats-resume-api-cmkh.onrender.com/v1/format';
    const ATS_API_KEY = process.env.ATS_API_KEY || 'demo-key';
    
    const pyRes = await fetch(ATS_ENDPOINT, {
      method: 'POST',
      headers: { 'X-API-Key': ATS_API_KEY },
      body: formData
    });
    
    if (!pyRes.ok) {
      throw new AppError(500, 'Python API error: ' + pyRes.statusText);
    }
    
    const parsedJson = await pyRes.json();
    
    // Save to ResumeVersions as v1
    const repo = AppDataSource.getRepository(ResumeVersion);
    const existingVersions = await repo.count({ where: { userId: req.user!.userId } });
    
    const version = repo.create({
      userId: req.user!.userId,
      version: existingVersions + 1,
      profileData: parsedJson
    });
    await repo.save(version);
    
    res.json({ success: true, data: { parsedJson, version: version.version } });
  } catch (error) {
    next(error);
  }
};

export const saveResumeDraft: RequestHandler = async (req, res, next) => {
  try {
    if (req.user!.role.toLowerCase() !== 'candidate') {
      throw new AppError(403, 'Only candidates can save drafts');
    }
    const { parsedJson } = req.body;
    
    const repo = AppDataSource.getRepository(ResumeVersion);
    const existingVersions = await repo.count({ where: { userId: req.user!.userId } });
    
    const version = repo.create({
      userId: req.user!.userId,
      version: existingVersions + 1,
      profileData: parsedJson
    });
    await repo.save(version);
    
    // Update the main user parsedProfile so jobs can match
    const userRepo = AppDataSource.getRepository(User);
    await userRepo.update({ userId: req.user!.userId }, { parsedProfile: JSON.stringify(parsedJson) });
    
    res.json({ success: true, data: { version: version.version } });
  } catch (error) {
    next(error);
  }
};

export const uploadResume: RequestHandler = async (req, res, next) => {
  try {
    if (req.user!.role.toLowerCase() !== 'candidate') {
      throw new AppError(403, 'Only candidates can upload a resume');
    }
    const { fileName, dataBase64, parsed } = req.body;
    const user = await authService.uploadResume(
      req.user!.userId,
      fileName,
      dataBase64,
      parsed ?? null,
    );
    res.json({ success: true, data: { user: toSafeUser(user) } });
  } catch (error) {
    next(error);
  }
};

export const changePassword: RequestHandler = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ success: true, data: { message: 'Password changed' } });
  } catch (error) {
    next(error);
  }
};

export const logoutUser: RequestHandler = async (_req, res) => {
  res
    .clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined })
    .json({ success: true, data: { message: 'Logged out' } });
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user!.userId, req.body);
    res.json({ success: true, data: { user: toSafeUser(user) } });
  } catch (error) {
    next(error);
  }
};

export const logSearchHistory: RequestHandler = async (req, res, next) => {
  try {
    const { keyword } = req.body;
    if (keyword && typeof keyword === 'string' && req.user) {
      const repo = AppDataSource.getRepository(SearchHistory);
      await repo.save(repo.create({
        userId: req.user.userId,
        role: req.user.role,
        keyword: keyword.trim().slice(0, 255),
      }));
    }
    res.json({ success: true, data: { message: 'Logged' } });
  } catch (error) {
    next(error);
  }
};
