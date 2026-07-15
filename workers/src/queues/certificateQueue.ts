// workers/src/queues/certificateQueue.ts
// Consumer cho Cloudflare Queues - Xử lý tạo chứng nhận batch

import type { Env } from '../types';
import { processBatch } from '../services/certificateBatchProcessor';

export interface CertificateQueueMessage {
  batchId: string;
  templateId: string;
  students: any[];
  teacherName: string;
  customNote: string;
  r2PublicUrl: string;
}

export default {
  async queue(batch: MessageBatch<CertificateQueueMessage>, env: Env, ctx: ExecutionContext) {
    console.log(`Processing ${batch.messages.length} certificate batch messages`);

    for (const message of batch.messages) {
      const data = message.body;

      try {
        await processBatch(
          env,
          data.batchId,
          data.templateId,
          data.students,
          data.teacherName,
          data.customNote,
          data.r2PublicUrl
        );

        // Xác nhận đã xử lý thành công
        message.ack();
        console.log(`✅ Batch ${data.batchId} processed successfully`);
      } catch (error) {
        console.error(`❌ Failed to process batch ${data.batchId}:`, error);

        // Có thể retry hoặc ack để tránh lặp vô hạn
        // Hiện tại chúng ta ack để tránh spam queue
        message.ack();
      }
    }
  },
};