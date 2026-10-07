import { hydratedCanvas } from '../resume/resume.controller.js';
import { SearchHistory } from '../user/search-history.entity.js';
import { AppDataSource } from '../../database/data-source.js';
import { User } from '../user/user.entity.js';
import type { RequestHandler } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { env } from '../../config/env.js';
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
    const ATS_ENDPOINT = `${env.ATS_ENDPOINT}/v1/format`;
    if (!env.ATS_API_KEY) {
      throw new AppError(503, 'Extraction service is not configured on the server');
    }
    const ATS_API_KEY = env.ATS_API_KEY;
    
    const pyRes = await fetch(ATS_ENDPOINT, {
      method: 'POST',
      headers: { 'X-API-Key': ATS_API_KEY },
      body: formData
    });
    
    if (!pyRes.ok) {
      throw new AppError(500, 'Python API error: ' + pyRes.statusText);
    }
    
    const parsedJson = await pyRes.json();
    
    await AppDataSource.transaction(async manager => {
      await manager.delete(ResumeVersion, { userId: req.user!.userId });
      await manager.getRepository(User).update(req.user!.userId, { parsedProfile: parsedJson });
    });
    res.json({ success: true, data: { parsedJson } });
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
    
    if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson) || parsedJson.pages) {
      throw new AppError(400, 'Canvas saves must use /api/auth/resume/current with the edited PDF.');
    }
    await AppDataSource.transaction(async manager => {
      await manager.delete(ResumeVersion, { userId: req.user!.userId });
      await manager.getRepository(User).update(req.user!.userId, { parsedProfile: parsedJson });
    });
    res.json({ success: true, data: { saved: true } });
  } catch (error) {
    next(error);
  }
};

/** Return only the authenticated candidate's own saved upload. */
export const getSavedResume: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user!;
    if (user.role.toLowerCase() !== 'candidate') {
      throw new AppError(403, 'Only candidates can retrieve their resume');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    if (!user.resumeFileName || (!user.resumeData && !user.resumePdf)) {
      res.json({ success: true, data: { resume: null } });
      return;
    }
    res.json({
      success: true,
      data: {
        resume: {
          fileName: user.resumeFileName,
          dataBase64: user.resumePdf?.toString('base64') ?? user.resumeData,
          canvas: await hydratedCanvas(user),
          uploadedAt: user.resumeUploadedAt,
          parsedProfile: user.parsedProfile,
        },
      },
    });
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

    /* Server-side extraction: send the file to the ATS resume service and
       store whatever it parses. The API key never leaves the backend. */
    let parsedProfile: Record<string, unknown> | null = parsed ?? null;
    let atsError: string | null = null;
    if (!parsedProfile && env.ATS_API_KEY.length > 0) {
      try {
        const buffer = Buffer.from(String(dataBase64), 'base64');
        const form = new FormData();
        form.append('file', new Blob([buffer], { type: 'application/pdf' }), fileName);
        form.append('max_pages', String(env.ATS_MAX_PAGES));
        const atsRes = await fetch(`${env.ATS_ENDPOINT}/v1/format`, {
          method: 'POST',
          headers: { 'X-API-Key': env.ATS_API_KEY },
          body: form,
        });
        if (!atsRes.ok) {
          atsError = `Extraction service replied ${atsRes.status}`;
        } else {
          parsedProfile = (await atsRes.json()) as Record<string, unknown>;
        }
      } catch {
        atsError = 'Extraction service is unreachable right now';
      }
    } else if (!parsedProfile) {
      atsError = 'Extraction service is not configured on the server';
    }

    const user = await authService.uploadResume(
      req.user!.userId,
      fileName,
      dataBase64,
      parsedProfile,
    );
    res.json({
      success: true,
      data: { user: toSafeUser(user), parsed: parsedProfile, atsError },
    });
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
