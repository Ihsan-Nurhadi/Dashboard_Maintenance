import React from 'react';

export function StatusBadge({ status, type = 'ts' }) {
  if (!status) return <span className="badge badge-muted">-</span>;

  let className = 'badge ';
  let label = status;

  if (type === 'ts') {
    switch (status) {
      case 'PLAN':
        className += 'badge-plan';
        label = 'Direncanakan';
        break;
      case 'PROGRESS':
        className += 'badge-progress';
        label = 'Sedang Dikerjakan';
        break;
      case 'DONE':
        className += 'badge-done';
        label = 'Selesai';
        break;
      case 'TROUBLE':
        className += 'badge-trouble';
        label = 'Masih Trouble';
        break;
      default:
        className += 'badge-muted';
    }
  } else if (type === 'site_condition') {
    switch (status) {
      case 'ONLINE':
        className += 'badge-done';
        label = 'Online';
        break;
      case 'DEGRADED':
        className += 'badge-plan';
        label = 'Degraded';
        break;
      case 'OFFLINE':
        className += 'badge-trouble';
        label = 'Offline';
        break;
      default:
        className += 'badge-muted';
    }
  } else if (type === 'vpn') {
    switch (status) {
      case 'NEW_VPN':
        className += 'badge-done';
        label = 'NEW VPN';
        break;
      case 'OLD_VPN':
        className += 'badge-plan';
        label = 'OLD VPN';
        break;
      case 'VPN_GONE':
        className += 'badge-trouble';
        label = 'VPN GONE';
        break;
      default:
        className += 'badge-muted';
    }
  } else if (type === 'response') {
    switch (status) {
      case 'RESPONSE':
        className += 'badge-done';
        label = 'RESPONSE';
        break;
      case 'NO_RESPONSE':
        className += 'badge-trouble';
        label = 'NO RESPONSE';
        break;
      case 'RESPONSE_OFFLINE':
        className += 'badge-trouble';
        label = 'RESP | OFFLINE';
        break;
      default:
        className += 'badge-muted';
    }
  }

  return <span className={className}>{label}</span>;
}

