import React from 'react';

interface PopCamTextProps {
    text?: string;
    size?: string;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * PopCamText Component
 * 
 * Recreates the "POPCAM" text style with a dark purple/indigo main color
 * and a sharp pink 3D shadow effect for the web using Tailwind CSS.
 */
const PopCamText: React.FC<PopCamTextProps> = ({
    text = 'POPCAM',
    size = '5rem',
    className = '',
    style
}) => {
    return (
        <div
            className={`flex items-center justify-center p-5 ${className}`}
            style={{ ...style }}
        >
            <span
                className="font-['Inter',_sans-serif] text-pop-purple font-[900] uppercase tracking-wider select-none leading-none"
                style={{
                    fontSize: size,
                    textShadow: '0px 13px 0px #F472B6'
                }}
            >
                {text}
            </span>
        </div>
    );
};

export default PopCamText;
