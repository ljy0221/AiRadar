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
  onSave: (newData: { nickname: string; password: string }) => void;
  isLoading?: boolean;
}

export const EditProfileModal = ({ isOpen, onClose, initialData, onSave, isLoading }: EditProfileModalProps) => {
  const [nickname, setNickname] = useState(initialData.nickname);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password && password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    onSave({ nickname, password });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="회원 정보 수정" maxWidth="3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium mb-1">이름</label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="이름을 입력하세요"
            required
          />
        </div>

        {/* 새 비밀번호 */}
        <div>
          <label className="block text-sm font-medium mb-1">새 비밀번호</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="변경할 비밀번호"
          />
        </div>

        {/* 비밀번호 확인 */}
        <div>
          <label className="block text-sm font-medium mb-1">비밀번호 확인</label>
          <Input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호를 다시 입력하세요"
          />
        </div>

        {/* 에러 메시지 */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
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
