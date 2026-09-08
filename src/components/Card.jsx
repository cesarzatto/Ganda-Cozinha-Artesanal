export default function Card({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={`bg-white rounded-3xl shadow-[0_2px_10px_rgba(59,31,22,0.08)] p-4 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
