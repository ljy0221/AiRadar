'use client';

import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (password: string) => void;
  isLoading?: boolean;
}

export const ChangePasswordModal = ({ isOpen, onClose, onSave, isLoading }: ChangePasswordModalProps) => {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    onSave(password);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="비밀번호 변경" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 새 비밀번호 */}
        <div>
          <label className="block text-sm font-medium mb-1">새 비밀번호</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="변경할 비밀번호"
            required
            autoFocus
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
            required
          />
        </div>

        {/* 에러 메시지 */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button type="submit" disabled={isLoading || !password || !passwordConfirm}>
            {isLoading ? '저장 중...' : '변경하기'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
