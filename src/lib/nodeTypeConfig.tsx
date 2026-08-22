import {
  User, Building2, MapPin, CalendarDays, FileText,
  Package, Search, Gem, AlertTriangle, NotebookPen,
} from 'lucide-react';
import type { NodeType } from '../types';

export interface NodeTypeConfig {
  label: string;
  icon: React.ReactNode;
  color: string;          // Tailwind text/bg classes for badge
  dot: string;            // CSS hex for sidebar dot
}

export const NODE_TYPE_CONFIG: Record<NodeType, NodeTypeConfig> = {
  person:       { label: 'Person',       icon: <User size={10} />,         color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',       dot: '#60a5fa' },
  organization: { label: 'Organization', icon: <Building2 size={10} />,    color: 'text-purple-400 bg-purple-400/10 border-purple-400/30',  dot: '#a78bfa' },
  location:     { label: 'Location',     icon: <MapPin size={10} />,       color: 'text-green-400 bg-green-400/10 border-green-400/30',    dot: '#4ade80' },
  object:       { label: 'Object',       icon: <Package size={10} />,      color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', dot: '#fb923c' },
  event:        { label: 'Event',        icon: <CalendarDays size={10} />, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',    dot: '#fbbf24' },
  document:     { label: 'Document',     icon: <FileText size={10} />,     color: 'text-slate-400 bg-slate-400/10 border-slate-400/30',    dot: '#94a3b8' },
  fieldnote:    { label: 'Field Notes',  icon: <NotebookPen size={10} />,  color: 'text-teal-400 bg-teal-400/10 border-teal-400/30',       dot: '#2dd4bf' },
  clue:         { label: 'Clue',         icon: <Search size={10} />,       color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',       dot: '#22d3ee' },
  truth:        { label: 'Truth',        icon: <Gem size={10} />,          color: 'text-yellow-300 bg-yellow-300/10 border-yellow-300/30', dot: '#fde047' },
  threat:       { label: 'Threat',       icon: <AlertTriangle size={10} />, color: 'text-red-400 bg-red-400/10 border-red-400/30',         dot: '#f87171' },
};

export const ALL_NODE_TYPES = Object.keys(NODE_TYPE_CONFIG) as NodeType[];
