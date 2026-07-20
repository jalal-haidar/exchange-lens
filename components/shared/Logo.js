"use client";

export default function Logo({ className = "" }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="40" height="40" rx="10" fill="#2563eb" />
        <text x="20" y="27" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="sans-serif">
          ₤
        </text>
      </svg>
    </div>
  );
}
