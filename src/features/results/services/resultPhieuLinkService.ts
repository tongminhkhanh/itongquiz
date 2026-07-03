/**
 * resultPhieuLinkService
 * Tái sử dụng phieuService.upsertPhieu + publish_phieu_batch / deactivate_public_phieu_link
 * cho trang Kết quả BT trắc nghiệm.
 *
 * expiresInDays = undefined → link vĩnh viễn, giáo viên thu hồi thủ công.
 */
import { callApi } from '../../../services/apiAdapter';
import type { PhieuNhanXetInput, PhieuNhanXet, PhieuPublicLink, PublishPhieuBatchResult } from '../../homework/types/phieu.types';
import { phieuService } from '../../homework/services/phieuService';

export interface PublishResultLinkInput {
  /** PhieuNhanXetInput đã build sẵn từ modal — dùng để upsert nếu chưa có id */
  phieuInput: PhieuNhanXetInput;
  /** Nếu đã upsert trước thì truyền vào để skip upsert */
  existingPhieuId?: string;
}

export const resultPhieuLinkService = {
  /**
   * Auto-upsert phiếu (nếu chưa có id) rồi publish → trả về { phieu, link }.
   */
  async upsertAndPublish(input: PublishResultLinkInput): Promise<{ phieu: PhieuNhanXet; link: PhieuPublicLink }> {
    // Bước 1: upsert phiếu nếu chưa có id
    const phieu = input.existingPhieuId
      ? ({ id: input.existingPhieuId } as PhieuNhanXet)  // đủ để lấy id
      : await phieuService.upsertPhieu(input.phieuInput);

    // Bước 2: publish để lấy link
    const response = await callApi<{ status: string; data: PublishPhieuBatchResult; message?: string }>(
      'publish_phieu_batch',
      {
        assignmentId:  input.phieuInput.submission_id,
        classId:       input.phieuInput.class_id,
        teacherId:     input.phieuInput.created_by,
        title:         input.phieuInput.ten_bai_tap,
        phieuIds:      [phieu.id],
        expiresInDays: undefined,
      },
    );
    if (response.status === 'success') return { phieu, link: response.data.links[0] };
    throw new Error(response.message ?? 'Không thể xuất link phụ huynh');
  },

  /**
   * Thu hồi link phụ huynh bằng publicToken.
   */
  async revokeLink(publicToken: string): Promise<void> {
    const response = await callApi<{ status: string; message?: string }>(
      'deactivate_public_phieu_link',
      { publicToken },
    );
    if (response.status !== 'success') {
      throw new Error(response.message ?? 'Không thể thu hồi link');
    }
  },
};
