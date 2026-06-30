import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from '../applications/job-application.entity';
import { AiService } from '../ai/ai.service';
import { ChatTurnDto } from './dto/send-chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
    private readonly aiService: AiService,
  ) {}

  async chat(userId: string, userName: string, message: string, history: ChatTurnDto[]): Promise<string> {
    const apps = await this.appRepo.find({
      where: { userId },
      relations: ['company'],
      order: { appliedAt: 'DESC' },
      take: 40,
    });

    const prompt = this.buildPrompt(userName, apps, history, message);
    return this.aiService.complete(prompt, userId);
  }

  private buildPrompt(
    userName: string,
    apps: JobApplication[],
    history: ChatTurnDto[],
    message: string,
  ): string {
    const counts = { APPLIED: 0, SCREENING: 0, INTERVIEW: 0, OFFER: 0, REJECTED: 0, WITHDRAWN: 0 };
    for (const a of apps) counts[a.status] = (counts[a.status] ?? 0) + 1;

    const appList = apps
      .slice(0, 25)
      .map((a, i) => {
        const date = new Date(a.appliedAt).toLocaleDateString('vi-VN');
        const notes = a.notes ? ` | Ghi chú: ${a.notes.slice(0, 80)}` : '';
        return `${i + 1}. ${a.jobTitle} tại ${a.company.name} — ${a.status} — ${date}${notes}`;
      })
      .join('\n');

    const historyText = history.length
      ? history.map((t) => `${t.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${t.content}`).join('\n')
      : '(Đây là tin nhắn đầu tiên)';

    return `Bạn là JobTracker AI — trợ lý thông minh giúp phân tích và quản lý hành trình tìm việc.

Tên người dùng: ${userName}

=== DỮ LIỆU ỨNG TUYỂN ===
Tổng: ${apps.length} ứng tuyển
• Applied: ${counts.APPLIED}  • Screening: ${counts.SCREENING}  • Interview: ${counts.INTERVIEW}
• Offer: ${counts.OFFER}  • Rejected: ${counts.REJECTED}  • Withdrawn: ${counts.WITHDRAWN}

${apps.length > 0 ? `Danh sách (${Math.min(25, apps.length)} gần nhất):\n${appList}` : 'Chưa có ứng tuyển nào.'}

=== LỊCH SỬ HỘI THOẠI ===
${historyText}

=== TIN NHẮN HIỆN TẠI ===
Người dùng: ${message}

Hướng dẫn:
- Trả lời bằng tiếng Việt (trừ khi người dùng hỏi bằng tiếng Anh)
- Ngắn gọn, thực tế, hữu ích — không dài dòng
- Phân tích xu hướng, so sánh công ty, đưa lời khuyên dựa trên dữ liệu thực
- Không bịa thông tin ngoài dữ liệu được cung cấp

Trả lời:`;
  }
}
