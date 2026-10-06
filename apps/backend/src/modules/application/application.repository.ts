import { AppDataSource } from '../../database/data-source.js';
import { Application } from './application.entity.js';

export class ApplicationRepository {
  private readonly repository = AppDataSource.getRepository(Application);

  async findByCandidate(candidateId: string) {
    return this.repository.find({
      where: { candidateId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByJobAndCandidate(jobId: string, candidateId: string) {
    return this.repository.findOneBy({ jobId, candidateId });
  }

  async create(data: { jobId: string; candidateId: string }) {
    return this.repository.save(this.repository.create(data));
  }

  async countByCandidate(candidateId: string) {
    return this.repository.count({ where: { candidateId } });
  }

  async countAll() {
    return this.repository.count();
  }
}
