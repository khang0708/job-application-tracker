import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Company } from './company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
  ) {}

  search(q: string): Promise<Company[]> {
    return this.companiesRepository.find({
      where: { name: ILike(`%${q}%`) },
      order: { name: 'ASC' },
      take: 10,
    });
  }

  // Find existing company by exact name (case-insensitive) or create it.
  // Used internally when creating a job application.
  async findOrCreate(name: string): Promise<Company> {
    const existing = await this.companiesRepository.findOne({
      where: { name: ILike(name) },
    });
    if (existing) return existing;
    return this.companiesRepository.save(
      this.companiesRepository.create({ name }),
    );
  }

  async patch(id: string, data: Partial<Pick<Company, 'domain' | 'analysis'>>): Promise<Company> {
    await this.companiesRepository.update(id, data);
    return this.companiesRepository.findOneOrFail({ where: { id } });
  }
}
