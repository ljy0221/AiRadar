'use client';

import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    nickname: string;
    email: string;
  };
  onSave: (newData: { nickname: string; email: string }) => void;
  isLoading?: boolean;
}

export const EditProfileModal = ({ isOpen, onClose, initialData, onSave, isLoading }: EditProfileModalProps) => {
  const [nickname, setNickname] = useState(initialData.nickname);
  const [email, setEmail] = useState(initialData.email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ nickname, email });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="회원 정보 수정" maxWidth="3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">닉네임</label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">이메일</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장하기'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
