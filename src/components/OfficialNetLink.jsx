import React from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';

export default function OfficialNetLink({ mobile = false, onOpen }) {
  return (
    <a
      className={mobile ? 'mobile-official-net official-net-link' : 'nav-item official-net-link'}
      href="https://login.net.fje.edu/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="La NET oficial (s’obre en una pestanya nova)"
      title="La NET oficial · S’obre en una pestanya nova"
      onClick={onOpen}
    >
      <span className="nav-art" aria-hidden="true">
        <img
          src="/images/ui/official-net-3d-v2.webp"
          alt=""
          width={mobile ? 32 : 44}
          height={mobile ? 32 : 44}
          decoding="async"
        />
      </span>
      <span className="official-net-label">
        La NET oficial <ArrowSquareOut size={14} aria-hidden="true" />
      </span>
    </a>
  );
}
