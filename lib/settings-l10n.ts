import { getCurrentLocaleGroup, type LocaleGroup } from '@/lib/i18n';

export type SettingsText = {
  tabLabel: string;
  title: string;
  caption: string;
  providerLabel: string;
  nameLabel: string;
  emailLabel: string;
  saveButton: string;
  logoutButton: string;
  saveSuccess: string;
  saveFailed: string;
  nameRequired: string;
  emailInvalid: string;
  providerEmail: string;
  providerLine: string;
  providerX: string;
};

const americas: SettingsText = {
  tabLabel: 'Settings',
  title: 'Account Settings',
  caption: 'Manage your profile and account session.',
  providerLabel: 'Signup Method',
  nameLabel: 'Name',
  emailLabel: 'Email',
  saveButton: 'Save Changes',
  logoutButton: 'Log Out',
  saveSuccess: 'Profile updated.',
  saveFailed: 'Failed to update profile.',
  nameRequired: 'Name is required.',
  emailInvalid: 'Enter a valid email address.',
  providerEmail: 'Email',
  providerLine: 'LINE',
  providerX: 'X',
};

const europe: SettingsText = {
  ...americas,
};

const china: SettingsText = {
  tabLabel: '设置',
  title: '账号设置',
  caption: '管理个人信息与登录状态。',
  providerLabel: '注册方式',
  nameLabel: '姓名',
  emailLabel: '邮箱',
  saveButton: '保存修改',
  logoutButton: '退出登录',
  saveSuccess: '资料已更新。',
  saveFailed: '资料更新失败。',
  nameRequired: '请输入姓名。',
  emailInvalid: '请输入有效邮箱地址。',
  providerEmail: '邮箱',
  providerLine: 'LINE',
  providerX: 'X',
};

const korea: SettingsText = {
  tabLabel: '설정',
  title: '계정 설정',
  caption: '프로필과 로그인 상태를 관리합니다.',
  providerLabel: '가입 방식',
  nameLabel: '이름',
  emailLabel: '이메일',
  saveButton: '변경 저장',
  logoutButton: '로그아웃',
  saveSuccess: '프로필이 업데이트되었습니다.',
  saveFailed: '프로필 업데이트에 실패했습니다.',
  nameRequired: '이름을 입력해 주세요.',
  emailInvalid: '유효한 이메일 주소를 입력해 주세요.',
  providerEmail: '이메일',
  providerLine: 'LINE',
  providerX: 'X',
};

const japan: SettingsText = {
  tabLabel: '設定',
  title: 'アカウント設定',
  caption: '登録情報の編集とログアウトを行えます。',
  providerLabel: '登録方法',
  nameLabel: '名前',
  emailLabel: 'メールアドレス',
  saveButton: '変更を保存',
  logoutButton: 'ログアウト',
  saveSuccess: '登録情報を更新しました。',
  saveFailed: '登録情報の更新に失敗しました。',
  nameRequired: '名前を入力してください。',
  emailInvalid: '有効なメールアドレスを入力してください。',
  providerEmail: 'メール',
  providerLine: 'LINE',
  providerX: 'X',
};

const texts: Record<LocaleGroup, SettingsText> = {
  americas,
  europe,
  china,
  korea,
  japan,
};

export function getSettingsText() {
  return texts[getCurrentLocaleGroup()];
}
