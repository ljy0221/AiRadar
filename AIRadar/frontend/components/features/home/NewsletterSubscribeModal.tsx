'use client';

import React from 'react';
import { Mail, User, Briefcase, ChevronDown } from 'lucide-react';
import { Input, Modal } from '@/components/common';

interface NewsletterSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NewsletterSubscribeModal = ({ isOpen, onClose, onSuccess }: NewsletterSubscribeModalProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('구독이 완료되었습니다! 매주 유익한 인사이트를 전해드릴게요.');
    if (onSuccess) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-6 py-4 px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[#C8432A] tracking-tighter mb-1">Join the Intel</h2>
          <p className="text-gray-400 text-xs">최신 AI 동향을 누구보다 빠르게 받아보세요.</p>
        </div>
        <form className="flex flex-col w-full gap-4" onSubmit={handleSubmit}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="w-4 h-4 text-gray-500" />
            </div>
            <Input type="email" placeholder="you@email.com" className="w-full pl-10 bg-gray-50/50 dark:bg-gray-800/20 border-gray-700 text-sm" required />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <Input type="text" placeholder="닉네임" className="w-full pl-10 bg-gray-50/50 dark:bg-gray-800/20 border-gray-700 text-sm" required />
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Briefcase className="w-4 h-4 text-gray-500" />
              </div>
              <select className="w-full pl-10 pr-4 py-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8432A] transition-all appearance-none cursor-pointer" required defaultValue="">
                <option value="" disabled hidden>직군 선택</option>
                <option value="프론트엔드">프론트엔드</option>
                <option value="백엔드">백엔드</option>
                <option value="데이터/AI">데이터/AI</option>
                <option value="기획/PM">기획/PM</option>
                <option value="디자인">디자인</option>
                <option value="기타">기타</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </div>
            </div>
          </div>
          <button type="submit" className="w-full py-3.5 text-base bg-[#C8432A] text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-all active:scale-95">
            뉴스레터 시작하기
          </button>
        </form>
      </div>
    </Modal>
  );
};
