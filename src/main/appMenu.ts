import type { MenuItemConstructorOptions } from 'electron';

import { languageNames, languages, t, type Language, type LanguageChoice } from '../shared/i18n';

export function applicationMenuTemplate(
  language: Language,
  choice: LanguageChoice,
  onLanguage: (choice: LanguageChoice) => void,
  onPreferences: () => void,
  onHelp: () => void
): MenuItemConstructorOptions[] {
  const label = (key: Parameters<typeof t>[1]) => t(language, key);
  const languageItems: MenuItemConstructorOptions[] = [
    { label: label('systemDefault'), type: 'radio', checked: choice === 'system', click: () => onLanguage('system') },
    { type: 'separator' },
    ...languages.map((option): MenuItemConstructorOptions => ({
      label: languageNames[option],
      type: 'radio',
      checked: choice === option,
      click: () => onLanguage(option)
    }))
  ];

  return [
    {
      label: 'CleanSlate',
      submenu: [
        { label: label('menuAbout'), role: 'about' },
        { type: 'separator' },
        { label: label('menuPreferences'), accelerator: 'CmdOrCtrl+,', click: onPreferences },
        { label: label('language'), submenu: languageItems },
        { type: 'separator' },
        { label: label('menuServices'), role: 'services' },
        { type: 'separator' },
        { label: label('menuHide'), role: 'hide' },
        { label: label('menuHideOthers'), role: 'hideOthers' },
        { label: label('menuShowAll'), role: 'unhide' },
        { type: 'separator' },
        { label: label('menuQuit'), role: 'quit' }
      ]
    },
    { label: label('menuFile'), submenu: [{ label: label('menuClose'), role: 'close' }] },
    {
      label: label('menuEdit'),
      submenu: [
        { label: label('menuUndo'), role: 'undo' },
        { label: label('menuRedo'), role: 'redo' },
        { type: 'separator' },
        { label: label('menuCut'), role: 'cut' },
        { label: label('menuCopy'), role: 'copy' },
        { label: label('menuPaste'), role: 'paste' },
        { label: label('menuSelectAll'), role: 'selectAll' }
      ]
    },
    {
      label: label('menuView'),
      submenu: [
        { label: label('menuActualSize'), role: 'resetZoom' },
        { label: label('menuZoomIn'), role: 'zoomIn' },
        { label: label('menuZoomOut'), role: 'zoomOut' },
        { type: 'separator' },
        { label: label('menuFullScreen'), role: 'togglefullscreen' }
      ]
    },
    {
      label: label('menuWindow'),
      submenu: [
        { label: label('menuMinimize'), role: 'minimize' },
        { label: label('menuBringFront'), role: 'front' }
      ]
    },
    { label: label('menuHelp'), role: 'help', submenu: [{ label: label('menuHelpItem'), click: onHelp }] }
  ];
}
