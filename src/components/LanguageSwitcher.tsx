import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { LANGS, useI18n } from '../i18n';
import type { Lang } from '../i18n';

/** Each language is shown in its own script (not translated). */
const LABEL: Record<Lang, string> = { 'zh-Hant': '中', en: 'EN' };

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <ToggleButtonGroup
      value={lang}
      exclusive
      size="small"
      aria-label="language"
      onChange={(_, v: Lang | null) => {
        if (v) setLang(v);
      }}
      sx={{
        ml: 1,
        '& .MuiToggleButton-root': {
          color: 'common.white',
          borderColor: 'rgba(255,255,255,0.5)',
          px: 1.25,
          py: 0.25,
          lineHeight: 1.4,
        },
        '& .Mui-selected': {
          bgcolor: 'rgba(255,255,255,0.22) !important',
          color: 'common.white',
        },
      }}
    >
      {LANGS.map((l) => (
        <ToggleButton key={l} value={l}>
          {LABEL[l]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
