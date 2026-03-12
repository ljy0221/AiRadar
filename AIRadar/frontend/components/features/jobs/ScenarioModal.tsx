import { Modal } from '@/components/common/Modal';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  steps: string[];
}

export const ScenarioModal = ({ isOpen, onClose, title, description, steps }: ScenarioModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-6 pt-2">
        <div>
           <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">업무 내용</h4>
           <p className="font-semibold text-lg">{description}</p>
        </div>

        <div>
           <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">수행 단계</h4>
           <div className="flex flex-col gap-4">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-bold flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 pt-0.5 leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </Modal>
  );
};
