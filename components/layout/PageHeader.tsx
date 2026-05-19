"use client";

import { Header } from "./Header";
import { useOpenMobileMenu } from "./AppShell";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: Props) {
  const openMenu = useOpenMobileMenu();
  return (
    <Header title={title} description={description} onMenuClick={openMenu} actions={actions} />
  );
}
