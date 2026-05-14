import { Tag } from "antd";
import { MerchantSelector } from "../../../shared/components/MerchantSelector";

interface MerchantScopeSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
}

export const MerchantScopeSelector: React.FC<MerchantScopeSelectorProps> = ({
  value,
  onChange,
  disabled,
}) => {
  return (
    <MerchantSelector
      mode="multiple"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={disabled ? "已根据商户类别自动填充" : "请选择适用商户"}
      selectProps={{
        tagRender: (props: any) => {
          const { label, closable, onClose } = props;
          return (
            <Tag
              closable={!disabled && closable}
              onClose={onClose}
              style={{ marginRight: 3 }}
              color="blue"
            >
              {label}
            </Tag>
          );
        },
      }}
    />
  );
};
