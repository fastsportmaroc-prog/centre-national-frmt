"use client";

import { Header } from "@/components/layout/Header";
import { useV2OpenMobileMenu } from "./V2Shell";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function V2PageHeader({ title, description, actions }: Props) {
  const openMenu = useV2OpenMobileMenu();
  return (
    <Header title={title} description={description} onMenuClick={openMenu} actions={actions} />
  );
}
