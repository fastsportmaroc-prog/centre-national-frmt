"use client";

import { Header } from "./Header";
import { useOpenMobileMenu } from "./AppShell";
import { useV2OpenMobileMenu } from "@/components/v2/V2Shell";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: Props) {
  const openV1 = useOpenMobileMenu();
  const openV2 = useV2OpenMobileMenu();
  const openMenu = () => {
    openV1();
    openV2();
  };
  return (
    <Header title={title} description={description} onMenuClick={openMenu} actions={actions} />
  );
}
