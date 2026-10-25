import Image from 'next/image';

export function Brand() {
  return (
    <span className="brand-lockup">
      <Image src="/brand/archy.png" width={28} height={28} alt="" />
      <span>Archy</span>
    </span>
  );
}
