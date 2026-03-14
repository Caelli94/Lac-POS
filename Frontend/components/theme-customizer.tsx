'use client'

import React from 'react'

export interface ThemeConfig {
    primary_color?: string;
    border_radius?: string;
    shadow_intensity?: string;
    shadow_color?: string;
    button_shadow?: string;
    text_shadow?: string;
    form_shadow?: string;
    typography?: {
        font_family?: string;
        bold?: boolean;
        underline?: boolean;
        title_font?: string;
        title_bold?: boolean;
        title_underline?: boolean;
        subtitle_font?: string;
        subtitle_bold?: boolean;
        subtitle_underline?: boolean;
        text_font?: string;
        text_bold?: boolean;
        text_underline?: boolean;
        sidebar_font?: string;
        sidebar_size?: string;
        sidebar_bold?: boolean;
        sidebar_underline?: boolean;
        title_size?: string;
        subtitle_size?: string;
        text_size?: string;
        title_color?: string;
        subtitle_color?: string;
        text_color?: string;
    };
    forms?: {
        input_height?: string;
        input_border_color?: string;
        label_size?: string;
    };
    buttons?: {
        border_radius?: string;
        text_transform?: string;
        font_weight?: string;
        shadow?: string;
    };
    checkboxes?: {
        size?: 'sm' | 'md' | 'lg';
        color?: string;
        tick_color?: string;
        shadow?: string;
        radius?: string;
    };
    light?: {
        background?: string;
        card?: string;
        foreground?: string;
    };
    dark?: {
        background?: string;
        card?: string;
        foreground?: string;
    };
    sidebar?: {
        light_bg?: string;
        light_border?: string;
        light_item_hover?: string;
        light_text?: string;
        light_active_bg?: string;
        light_active_text?: string;
        dark_bg?: string;
        dark_border?: string;
        dark_item_hover?: string;
        dark_text?: string;
        dark_active_bg?: string;
        dark_active_text?: string;
    };
}

export function ThemeCustomizer({ config }: { config?: ThemeConfig }) {
    if (!config) return null;

    const generateCSS = () => {
        let css = ':root {\n';

        // Shadow & Colors
        const shadowOpacity = config.shadow_intensity || '0.1';
        const shadowColor = config.shadow_color || '#000000';

        // Helper to convert hex to rgb for variable opacity shadows
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
        };

        const rgbShadow = shadowColor.startsWith('#') ? hexToRgb(shadowColor) : '0, 0, 0';

        css += `  --shadow-rgb: ${rgbShadow} !important;\n`;
        css += `  --shadow-color: ${rgbShadow} / ${shadowOpacity} !important;\n`;

        // Custom shadows
        const btnOpacity = (config.buttons?.shadow || config.button_shadow) || '0';
        const txtOpacity = config.text_shadow || '0';
        const frmOpacity = config.form_shadow || '0';

        css += `  --button-shadow: 0 4px 12px rgba(${rgbShadow}, ${btnOpacity}) !important;\n`;
        css += `  --text-shadow: 0 2px 4px rgba(${rgbShadow}, ${txtOpacity}) !important;\n`;
        css += `  --form-shadow: 0 1px 3px rgba(${rgbShadow}, ${frmOpacity}) !important;\n`;

        // Colores y Bordes base
        if (config.primary_color) css += `  --primary: ${config.primary_color} !important;\n`;
        if (config.border_radius) css += `  --radius: ${config.border_radius} !important;\n`;

        // Typography
        if (config.typography) {
            if (config.typography.font_family) css += `  --font-sans: ${config.typography.font_family} !important;\n`;

            // Fonts
            if (config.typography.title_font) css += `  --font-title: ${config.typography.title_font} !important;\n`;
            else if (config.typography.font_family) css += `  --font-title: ${config.typography.font_family} !important;\n`;

            if (config.typography.subtitle_font) css += `  --font-subtitle: ${config.typography.subtitle_font} !important;\n`;
            else if (config.typography.font_family) css += `  --font-subtitle: ${config.typography.font_family} !important;\n`;

            if (config.typography.text_font) css += `  --font-text: ${config.typography.text_font} !important;\n`;
            else if (config.typography.font_family) css += `  --font-text: ${config.typography.font_family} !important;\n`;

            // Weights & Decorations
            const globalBold = config.typography.bold ? 'bold' : 'normal';
            const globalUnderline = config.typography.underline ? 'underline' : 'none';

            css += `  --title-weight: ${config.typography.title_bold !== undefined ? (config.typography.title_bold ? 'bold' : 'normal') : 'bold'} !important;\n`;
            css += `  --title-decoration: ${config.typography.title_underline !== undefined ? (config.typography.title_underline ? 'underline' : 'none') : globalUnderline} !important;\n`;

            css += `  --subtitle-weight: ${config.typography.subtitle_bold !== undefined ? (config.typography.subtitle_bold ? 'bold' : 'normal') : 'bold'} !important;\n`;
            css += `  --subtitle-decoration: ${config.typography.subtitle_underline !== undefined ? (config.typography.subtitle_underline ? 'underline' : 'none') : globalUnderline} !important;\n`;

            css += `  --text-weight: ${config.typography.text_bold !== undefined ? (config.typography.text_bold ? 'bold' : 'normal') : globalBold} !important;\n`;
            css += `  --text-decoration: ${config.typography.text_underline !== undefined ? (config.typography.text_underline ? 'underline' : 'none') : globalUnderline} !important;\n`;

            if (config.typography.sidebar_font) css += `  --sidebar-font: ${config.typography.sidebar_font} !important;\n`;
            else if (config.typography.font_family) css += `  --sidebar-font: ${config.typography.font_family} !important;\n`;

            if (config.typography.sidebar_size) css += `  --sidebar-size: ${config.typography.sidebar_size} !important;\n`;

            css += `  --sidebar-weight: ${config.typography.sidebar_bold !== undefined ? (config.typography.sidebar_bold ? 'bold' : 'normal') : globalBold} !important;\n`;
            css += `  --sidebar-decoration: ${config.typography.sidebar_underline !== undefined ? (config.typography.sidebar_underline ? 'underline' : 'none') : globalUnderline} !important;\n`;

            // Sizes
            if (config.typography.title_size) css += `  --title-size: ${config.typography.title_size} !important;\n`;
            if (config.typography.subtitle_size) css += `  --subtitle-size: ${config.typography.subtitle_size} !important;\n`;
            if (config.typography.text_size) css += `  --text-size: ${config.typography.text_size} !important;\n`;
        }

        // Forms
        if (config.forms) {
            if (config.forms.input_height) css += `  --input-height: ${config.forms.input_height} !important;\n`;
            if (config.forms.label_size) css += `  --label-size: ${config.forms.label_size} !important;\n`;
            if (config.forms.input_border_color) css += `  --input-border: ${config.forms.input_border_color} !important;\n`;
        }

        // Buttons
        if (config.buttons) {
            if (config.buttons.border_radius) css += `  --button-radius: ${config.buttons.border_radius} !important;\n`;
            if (config.buttons.text_transform) css += `  --button-transform: ${config.buttons.text_transform} !important;\n`;
            if (config.buttons.font_weight) css += `  --button-weight: ${config.buttons.font_weight} !important;\n`;
            if (config.buttons.shadow) css += `  --button-shadow: 0 4px 6px -1px rgba(0, 0, 0, ${config.buttons.shadow}), 0 2px 4px -1px rgba(0, 0, 0, ${parseFloat(config.buttons.shadow) / 2}) !important;\n`;
        } else {
            // Defaults if not set (fallback to general or standard values)
            css += `  --button-radius: 0.5rem !important;\n`;
            css += `  --button-transform: uppercase !important;\n`;
            css += `  --button-weight: 800 !important;\n`;
        }

        // Checkboxes
        if (config.checkboxes) {
            const sizeMap = { sm: '0.875rem', md: '1rem', lg: '1.25rem' };
            const size = config.checkboxes.size ? sizeMap[config.checkboxes.size] : '1rem';

            // Convert tick color named values if needed, though input type color handles customization
            // For "tick_color", we just pass the value. Custom checkbox component will use this.

            css += `  --checkbox-size: ${size} !important;\n`;
            css += `  --checkbox-color: ${config.checkboxes.color} !important;\n`;
            css += `  --checkbox-tick-color: ${config.checkboxes.tick_color} !important;\n`;

            const chkShadowOpacity = config.checkboxes.shadow || '0';
            css += `  --checkbox-shadow: 0 1px 2px rgba(${rgbShadow}, ${chkShadowOpacity}) !important;\n`;
            css += `  --checkbox-radius: ${config.checkboxes.radius} !important;\n`;
        } else {
            css += `  --checkbox-size: 1rem !important;\n`;
            css += `  --checkbox-color: var(--primary) !important;\n`;
            css += `  --checkbox-tick-color: white !important;\n`;
            css += `  --checkbox-shadow: none !important;\n`;
            css += `  --checkbox-radius: 0.25rem !important;\n`;
        }

        if (config.light) {
            if (config.light.background) css += `  --background: ${config.light.background} !important;\n`;
            if (config.light.card) css += `  --card: ${config.light.card} !important;\n`;
            if (config.light.foreground) css += `  --foreground: ${config.light.foreground} !important;\n`;

            if (config.typography?.title_color) css += `  --title-color: ${config.typography.title_color} !important;\n`;
            else css += `  --title-color: var(--foreground) !important;\n`;

            if (config.typography?.subtitle_color) css += `  --subtitle-color: ${config.typography.subtitle_color} !important;\n`;
            else css += `  --subtitle-color: var(--foreground) !important;\n`;

            if (config.typography?.text_color) css += `  --text-color: ${config.typography.text_color} !important;\n`;
            else css += `  --text-color: var(--foreground) !important;\n`;
        }

        // Sidebar Light
        if (config.sidebar) {
            if (config.sidebar.light_bg) css += `  --sidebar-bg: ${config.sidebar.light_bg} !important;\n`;
            if (config.sidebar.light_border) css += `  --sidebar-border: ${config.sidebar.light_border} !important;\n`;
            if (config.sidebar.light_text) css += `  --sidebar-text: ${config.sidebar.light_text} !important;\n`;
            if (config.sidebar.light_item_hover) css += `  --sidebar-hover: ${config.sidebar.light_item_hover} !important;\n`;
            if (config.sidebar.light_active_bg) css += `  --sidebar-active-bg: ${config.sidebar.light_active_bg} !important;\n`;
            if (config.sidebar.light_active_text) css += `  --sidebar-active-text: ${config.sidebar.light_active_text} !important;\n`;
        }

        css += '}\n\n';

        css += '.dark {\n';
        if (config.dark) {
            if (config.dark.background) css += `  --background: ${config.dark.background} !important;\n`;
            if (config.dark.card) css += `  --card: ${config.dark.card} !important;\n`;
            if (config.dark.foreground) css += `  --foreground: ${config.dark.foreground} !important;\n`;

            css += `  --title-color: var(--foreground) !important;\n`;
            css += `  --subtitle-color: var(--foreground) !important;\n`;
            css += `  --text-color: var(--foreground) !important;\n`;
        }

        // Sidebar Dark
        if (config.sidebar) {
            if (config.sidebar.dark_bg) css += `  --sidebar-bg: ${config.sidebar.dark_bg} !important;\n`;
            if (config.sidebar.dark_border) css += `  --sidebar-border: ${config.sidebar.dark_border} !important;\n`;
            if (config.sidebar.dark_text) css += `  --sidebar-text: ${config.sidebar.dark_text} !important;\n`;
            if (config.sidebar.dark_item_hover) css += `  --sidebar-hover: ${config.sidebar.dark_item_hover} !important;\n`;
            if (config.sidebar.dark_active_bg) css += `  --sidebar-active-bg: ${config.sidebar.dark_active_bg} !important;\n`;
            if (config.sidebar.dark_active_text) css += `  --sidebar-active-text: ${config.sidebar.dark_active_text} !important;\n`;
        }

        css += '}\n\n';

        // Estilos Globales
        css += `
        body { 
            font-family: var(--font-text, var(--font-sans)), system-ui, sans-serif !important; 
            font-size: var(--text-size) !important; 
            color: var(--text-color) !important; 
            background-color: var(--background) !important;
            font-weight: var(--text-weight) !important;
            text-decoration: var(--text-decoration) !important;
            text-shadow: var(--text-shadow) !important;
        }
        h1 { 
            font-family: var(--font-title, var(--font-sans)) !important;
            font-size: var(--title-size) !important; 
            color: var(--title-color) !important; 
            font-weight: var(--title-weight) !important;
            text-decoration: var(--title-decoration) !important;
            text-shadow: var(--text-shadow) !important;
        }
        h2, h3 { 
            font-family: var(--font-subtitle, var(--font-sans)) !important;
            font-size: var(--subtitle-size) !important; 
            color: var(--subtitle-color) !important; 
            font-weight: var(--subtitle-weight) !important;
            text-decoration: var(--subtitle-decoration) !important;
            text-shadow: var(--text-shadow) !important;
        }
        label { font-size: var(--label-size) !important; }
        .sidebar-label, 
        .sidebar-link, 
        .sidebar-item, 
        .app-sidebar [data-sidebar="label"],
        .app-sidebar [data-sidebar="menu-button"] { 
            font-family: var(--sidebar-font, var(--font-sans)) !important;
            font-size: var(--sidebar-size, var(--label-size)) !important;
            font-weight: var(--sidebar-weight, normal) !important;
            text-decoration: var(--sidebar-decoration, none) !important;
        }
        input, select, textarea { 
            height: var(--input-height) !important; 
            border-color: var(--input-border) !important; 
            box-shadow: var(--form-shadow) !important;
        }
        button, .btn, [role="button"] {
            box-shadow: var(--button-shadow) !important;
            border-radius: var(--button-radius) !important;
            text-transform: var(--button-transform) !important;
            font-weight: var(--button-weight) !important;
        }
        
        /* Sidebar Components */
        aside, .sidebar {
            background-color: var(--sidebar-bg) !important;
            border-color: var(--sidebar-border) !important;
        }
        .sidebar-link {
            color: var(--sidebar-text) !important;
        }
        .sidebar-link:hover {
            background-color: var(--sidebar-hover) !important;
            color: var(--primary) !important;
        }
        .sidebar-link-active {
            background-color: var(--sidebar-active-bg) !important;
            color: var(--sidebar-active-text) !important;
        }

        /* Aplicar sombras a tarjetas */
        .card, [class*="Card"] {
            box-shadow: 0 4px 6px -1px var(--shadow-color), 0 2px 4px -1px var(--shadow-color) !important;
        }
        `;

        return css;
    };

    return <style dangerouslySetInnerHTML={{ __html: generateCSS() }} />;
}
