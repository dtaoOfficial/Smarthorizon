const fs = require('fs');
let content = `import React from 'react';

export interface BrandLogoProps {
  variant?: 'navbar' | 'sidebar' | 'hero' | 'footer' | 'login' | 'partner' | 'badge' | 'banner';
  partner?: 'nhce' | 'iic' | 'aicte' | 'vtu' | 'badge' | 'banner';
  className?: string;
  onClick?: () => void;
}

export const getAssetPath = (filename: string): string => {
  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = baseUrl.replace(/\\/$/, '');
  const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
  return \`\${cleanBase}/assets/\${cleanFilename}\`;
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'navbar',
  partner,
  className = '',
  onClick,
}) => {
  // If rendering a partner logo or badge/banner (IIC, AICTE, VTU, NHCE, Badge, Banner)
  if (partner) {
    const partnerSrcMap: Record<string, string> = {
      iic: \`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/iic_logo.png\`,
      aicte: \`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/aicte_logo.png\`,
      vtu: \`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/vtu_logo.png\`,
      nhce: \`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/nhce_logo.png\`,
      badge: \`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/smart_horizon_badge.png\`,
      banner: \`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/full_event_banner.png\`,
    };

    const partnerAltMap: Record<string, string> = {
      iic: 'Institution Innovation Council (IIC)',
      aicte: 'AICTE',
      vtu: 'Visvesvaraya Technological University (VTU)',
      nhce: 'New Horizon College of Engineering',
      badge: 'Smart Horizon Official Badge',
      banner: 'Smart Horizon Event Banner',
    };

    const partnerHeights: Record<string, string> = {
      navbar: 'h-8 sm:h-9',
      footer: 'h-7 sm:h-8',
      hero: 'h-10 sm:h-12',
    };

    const heightClass = partnerHeights[variant] || 'h-8';

    return (
      <img
        src={partnerSrcMap[partner] || \`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/logo_final.png\`}
        alt={partnerAltMap[partner] || 'Partner Logo'}
        onClick={onClick}
        className={\`object-contain transition-opacity duration-200 select-none \${heightClass} \${
          onClick ? 'cursor-pointer hover:opacity-90' : ''
        } \${className}\`}
      />
    );
  }

  // Variant styling for main SmartHorizon / NHCE Brand Identity Logo & Badges
  switch (variant) {
    case 'badge':
      return (
        <img
          src={\`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/smart_horizon_badge.png\`}
          alt="Smart Horizon Official Badge"
          onClick={onClick}
          className={\`w-auto h-auto max-h-24 sm:max-h-32 object-contain select-none \${
            onClick ? 'cursor-pointer' : ''
          } \${className}\`}
        />
      );

    case 'banner':
      return (
        <img
          src={\`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/full_event_banner.png\`}
          alt="Smart Horizon Full Event Banner"
          onClick={onClick}
          className={\`w-full h-auto object-cover select-none \${
            onClick ? 'cursor-pointer' : ''
          } \${className}\`}
        />
      );

    case 'hero':
      return (
        <img
          src={\`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/logo_final.png\`}
          alt="SMART HORIZON 2026 Official Identity"
          onClick={onClick}
          className={\`w-auto h-auto max-h-56 sm:max-h-72 md:max-h-84 lg:max-h-96 object-contain select-none transition-transform duration-300 \${
            onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
          } \${className}\`}
        />
      );

    case 'sidebar':
      return (
        <img
          src={\`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/logo_final.png\`}
          alt="SmartHorizon OS"
          onClick={onClick}
          className={\`h-8 sm:h-9 max-w-[140px] object-contain select-none \${
            onClick ? 'cursor-pointer' : ''
          } \${className}\`}
        />
      );

    case 'login':
      return (
        <img
          src={\`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/logo_final.png\`}
          alt="Smart Horizon 2026"
          onClick={onClick}
          className={\`w-auto h-auto max-h-28 sm:max-h-36 md:max-h-44 object-contain select-none \${
            onClick ? 'cursor-pointer' : ''
          } \${className}\`}
        />
      );

    case 'footer':
      return (
        <img
          src={\`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/logo_final.png\`}
          alt="Smart Horizon 2026"
          onClick={onClick}
          className={\`h-9 sm:h-10 object-contain select-none \${
            onClick ? 'cursor-pointer' : ''
          } \${className}\`}
        />
      );

    case 'navbar':
    default:
      return (
        <img
          src={\`\${(import.meta as any).env.BASE_URL.replace(/\\/$/, '')}/assets/logo_final.png\`}
          alt="Smart Horizon 2026"
          onClick={onClick}
          className={\`h-8 sm:h-10 w-auto object-contain select-none \${
            onClick ? 'cursor-pointer' : ''
          } \${className}\`}
        />
      );
  }
};

export default BrandLogo;
`;
fs.writeFileSync('src/shared/components/BrandLogo.tsx', content);
