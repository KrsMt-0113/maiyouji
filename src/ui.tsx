import React, { useEffect, useRef } from 'react';
import {
  X,
  ArrowUpRight,
  LoaderCircle,
  RefreshCw,
  Inbox,
  Plus,
  Minus,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { money, safeUrl, type Bag, type Meal } from '../shared/domain';
import { useApp } from './state';
export function Sheet({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet ${wide ? 'wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-content">
        <div className="sheet-head">
          <h2>{title}</h2>
          <button autoFocus className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <div className="title-row">
        <h1>{title}</h1>
        {action}
      </div>
      {description && <p>{description}</p>}
    </header>
  );
}
export function SectionTitle({
  title,
  caption,
  onClick,
}: {
  title: string;
  caption?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {onClick ? (
        <button className="text-button" onClick={onClick}>
          {caption ?? '看看全部'}
          <ChevronRight size={16} />
        </button>
      ) : caption ? (
        <span className="muted small">{caption}</span>
      ) : null}
    </div>
  );
}
export function ResourceStatus({
  resource,
  empty,
  children,
}: {
  resource: { loading: boolean; error: string; reload: () => void; data: any };
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (resource.loading)
    return (
      <div className="state-box" role="status">
        <LoaderCircle className="spin" />
        <p>正在打开这份小惊喜…</p>
      </div>
    );
  if (resource.error)
    return (
      <div className="state-box">
        <p>{resource.error}</p>
        <button className="button secondary" onClick={resource.reload}>
          <RefreshCw size={16} />
          重新加载
        </button>
      </div>
    );
  if (empty) return <Empty title="这里暂时空空的" text="等下一份小惊喜出现。" />;
  return <>{children}</>;
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state-box empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function Quantity({
  value,
  onChange,
  min = 0,
  max = 99,
  label = '数量',
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="quantity">
      <button
        aria-label={`减少${label}`}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
      >
        <Minus size={15} />
      </button>
      <output aria-label={label}>{value}</output>
      <button
        aria-label={`增加${label}`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function FoodImage({
  src,
  name,
  className = '',
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [bad, setBad] = React.useState(false);
  return (
    <div className={`food-image ${className}`}>
      {!bad && safeUrl(src) ? (
        <img src={safeUrl(src)} alt={name} loading="lazy" onError={() => setBad(true)} />
      ) : (
        <span aria-label={name} className="food-placeholder">
          {name.includes('咖啡')
            ? '☕'
            : name.includes('薯')
              ? '🍟'
              : name.includes('冰')
                ? '🍦'
                : '🍔'}
        </span>
      )}
    </div>
  );
}
export function MealCard({
  meal,
  onClick,
  compact = false,
}: {
  meal: Meal;
  onClick: () => void;
  compact?: boolean;
}) {
  const a = useApp();
  const key = `${a.session?.mode}:${meal.code}`;
  const liked = a.favorites.includes(key);
  return (
    <article className={`meal-card ${compact ? 'compact' : ''}`}>
      <button className="meal-open" onClick={onClick} aria-label={`查看${meal.name}`}>
        <FoodImage src={meal.image} name={meal.name} />
        <div className="meal-info">
          <div className="meal-tag">{meal.tags[0] ?? '给味蕾一点快乐'}</div>
          <h3>{meal.name}</h3>
          <div className="meal-price">
            <strong>{money(meal.price)}</strong>
            {meal.originalPrice !== null &&
              meal.price !== null &&
              meal.originalPrice > meal.price && <del>{money(meal.originalPrice)}</del>}
          </div>
        </div>
      </button>
      <button
        className={`favorite ${liked ? 'liked' : ''}`}
        aria-label={`${liked ? '取消收藏' : '收藏'}${meal.name}`}
        onClick={() => a.setFavorites((f) => (liked ? f.filter((k) => k !== key) : [...f, key]))}
      >
        <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
      </button>
      <button className="add-food" aria-label={`选择${meal.name}`} onClick={onClick}>
        <Plus size={19} />
      </button>
    </article>
  );
}
const labels: Record<string, string> = {
  orderId: '订单编号',
  orderStatus: '订单状态',
  status: '状态',
  price: '价格（元）',
  amount: '金额（元）',
  realTotalAmount: '实付金额（元）',
  totalAmount: '总金额（元）',
  point: '扣减积分',
  consumePoint: '本次消耗积分',
  remainPoint: '剩余积分',
  remainChance: '剩余次数',
  successCount: '成功领取',
  failedCount: '领取失败',
  totalCount: '总数量',
  successCoupons: '领取成功的券',
  failedCoupons: '领取失败的券',
  couponName: '优惠券',
  productName: '餐品',
  quantity: '数量',
  cancelResult: '取消结果',
  message: '结果说明',
  code: '状态码',
  orderDetail: '订单详情',
  orderProductList: '订单餐品',
  goods: '商品',
  spuName: '商品名',
  skuName: '规格名',
  name: '名称',
  statusText: '状态',
  prizes: '奖品',
  win: '是否中奖',
  validDateInfo: '使用时间',
  orderStatusTitle: '订单状态',
  orderStatusSubTitle: '状态说明',
  contactName: '联系人',
  phone: '手机',
  fullAddress: '完整地址',
  addressId: '地址编号',
  coupon_title: '关联奖券',
  coupon_redeem_status: '核销状态',
  satisfaction_description: '满意度',
  coupon_trade_start_time: '奖券开始时间',
  coupon_trade_end_time: '奖券结束时间',
  coupon_order_food_types: '点餐方式（1到店 / 2外送）',
  storeName: '餐厅',
  storeAddress: '餐厅地址',
  takeWay: '取餐方式',
  pickupCode: '取餐码',
  createTime: '下单时间',
  deliveryInfo: '配送信息',
  deliveryAddress: '配送地址',
  expectDeliveryTime: '预计送达',
  remark: '备注',
  comboItemList: '套餐组成',
  itemName: '子项',
  itemQuantity: '数量',
  coupons: '券信息',
  reason: '原因',
  note: '购买须知',
  partyPeople: '人数说明',
  finish_time: '答卷完成时间',
  trade_no: '订单号',
  coupon_available_redeem_count: '可核销次数',
  customerServicePhone: '客服电话',
};
const hidden = new Set([
  'payH5Url',
  'payId',
  'upgPayId',
  'couponCodes',
  'couponCode',
  'codeValue',
  'lockerQrCode',
  'image',
  'imageUrl',
  'productImage',
  'skuImage',
  'couponImage',
]);
export function DataView({ value, depth = 0 }: { value: any; depth?: number }) {
  if (value == null) return <span className="muted">暂无信息</span>;
  if (typeof value === 'boolean') return <span>{value ? '是' : '否'}</span>;
  if (typeof value !== 'object') return <span className="break">{String(value)}</span>;
  if (depth > 5) return null;
  if (Array.isArray(value))
    return value.length ? (
      <div className="data-list">
        {value.map((v, i) => (
          <div className="data-item" key={i}>
            <DataView value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    ) : (
      <span className="muted">暂无记录</span>
    );
  return (
    <dl className="data-view">
      {Object.entries(value)
        .filter(([k, v]) => !hidden.has(k) && v != null)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{labels[k] ?? k}</dt>
            <dd>
              <DataView value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
    </dl>
  );
}
export function PaymentLink({ result }: { result: Bag }) {
  const url = safeUrl(result.payH5Url);
  return url ? (
    <div className="payment-box">
      <p>订单已创建。请自行打开支付页面完成支付，返回后刷新订单状态。</p>
      <a className="button primary" href={url} target="_blank" rel="noopener noreferrer">
        前往支付
        <ArrowUpRight size={17} />
      </a>
    </div>
  ) : null;
}
