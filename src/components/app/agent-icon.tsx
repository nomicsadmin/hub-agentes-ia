"use client"

import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  ChartLineUpIcon,
  GraduationCapIcon,
  HeartIcon,
  MegaphoneIcon,
  SparkleIcon,
  ChatCircleDotsIcon,
  CompassIcon,
  LightbulbIcon,
  PathIcon,
  PenNibIcon,
  RobotIcon,
  RocketLaunchIcon,
  TargetIcon,
  type Icon,
} from "@phosphor-icons/react"

/*
 * agents.icon guarda o nome do ícone Phosphor em kebab-case.
 * Para um ícone novo: importe de @phosphor-icons/react e adicione aqui.
 * Lista usada no agente.json (campo "icone"): as chaves abaixo.
 */
const ICONS: Record<string, Icon> = {
  "calendar-check": CalendarCheckIcon,
  path: PathIcon,
  robot: RobotIcon,
  compass: CompassIcon,
  lightbulb: LightbulbIcon,
  "pen-nib": PenNibIcon,
  target: TargetIcon,
  "rocket-launch": RocketLaunchIcon,
  chat: ChatCircleDotsIcon,
  "book-open": BookOpenIcon,
  briefcase: BriefcaseIcon,
  "chart-line-up": ChartLineUpIcon,
  "graduation-cap": GraduationCapIcon,
  heart: HeartIcon,
  megaphone: MegaphoneIcon,
  sparkle: SparkleIcon,
}

export function AgentIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? RobotIcon
  return <Cmp className={className} />
}
