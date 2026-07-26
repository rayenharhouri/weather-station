import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantService } from '../tenancy/tenant.service';
import {
  AccountPreference,
  AlertThresholds,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_OPS_NOTIFICATIONS,
  DEFAULT_THRESHOLDS,
  NotificationPreferences,
  OpsNotificationPreferences,
} from './entities/account-preference.entity';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

export interface AccountSnapshot {
  notifications: NotificationPreferences;
  citationFormat: AccountPreference['citationFormat'];
  autoCite: boolean;
  activeTokenId: string | null;
  orcid: string | null;
  affiliation: string | null;
}

export interface SettingsSnapshot {
  notifications: OpsNotificationPreferences;
  thresholds: AlertThresholds;
}

@Injectable()
export class AccountService {
  constructor(private readonly tenantService: TenantService) {}

  private async repo(tenantSlug: string): Promise<Repository<AccountPreference>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(AccountPreference);
  }

  async get(tenantSlug: string, userId: string): Promise<AccountSnapshot> {
    const repo = await this.repo(tenantSlug);
    const row = await repo.findOne({ where: { userId } });
    return toAccountSnapshot(row);
  }

  async patch(
    tenantSlug: string,
    userId: string,
    patch: UpdateAccountDto,
  ): Promise<AccountSnapshot> {
    const row = await this.touch(tenantSlug, userId);
    if (patch.notifications) {
      row.notifications = { ...row.notifications, ...patch.notifications };
    }
    if (patch.citationFormat !== undefined) row.citationFormat = patch.citationFormat;
    if (patch.autoCite !== undefined) row.autoCite = patch.autoCite;
    if (patch.activeTokenId !== undefined) row.activeTokenId = patch.activeTokenId;
    if (patch.orcid !== undefined) row.orcid = patch.orcid;
    if (patch.affiliation !== undefined) row.affiliation = patch.affiliation;
    const repo = await this.repo(tenantSlug);
    const saved = await repo.save(row);
    return toAccountSnapshot(saved);
  }

  async getSettings(tenantSlug: string, userId: string): Promise<SettingsSnapshot> {
    const repo = await this.repo(tenantSlug);
    const row = await repo.findOne({ where: { userId } });
    return toSettingsSnapshot(row);
  }

  async patchSettings(
    tenantSlug: string,
    userId: string,
    patch: UpdateSettingsDto,
  ): Promise<SettingsSnapshot> {
    const row = await this.touch(tenantSlug, userId);
    if (patch.notifications) {
      row.opsNotifications = { ...row.opsNotifications, ...patch.notifications };
    }
    if (patch.thresholds) {
      row.thresholds = { ...row.thresholds, ...patch.thresholds };
    }
    const repo = await this.repo(tenantSlug);
    const saved = await repo.save(row);
    return toSettingsSnapshot(saved);
  }

  private async touch(tenantSlug: string, userId: string): Promise<AccountPreference> {
    const repo = await this.repo(tenantSlug);
    let row = await repo.findOne({ where: { userId } });
    if (!row) {
      row = repo.create({
        userId,
        notifications: { ...DEFAULT_NOTIFICATIONS },
        citationFormat: 'apa',
        autoCite: true,
        activeTokenId: null,
        orcid: null,
        affiliation: null,
        thresholds: { ...DEFAULT_THRESHOLDS },
        opsNotifications: { ...DEFAULT_OPS_NOTIFICATIONS },
      });
    }
    return row;
  }
}

function toAccountSnapshot(row: AccountPreference | null): AccountSnapshot {
  if (!row) {
    return {
      notifications: { ...DEFAULT_NOTIFICATIONS },
      citationFormat: 'apa',
      autoCite: true,
      activeTokenId: null,
      orcid: null,
      affiliation: null,
    };
  }
  return {
    notifications: { ...DEFAULT_NOTIFICATIONS, ...row.notifications },
    citationFormat: row.citationFormat,
    autoCite: row.autoCite,
    activeTokenId: row.activeTokenId,
    orcid: row.orcid,
    affiliation: row.affiliation,
  };
}

function toSettingsSnapshot(row: AccountPreference | null): SettingsSnapshot {
  if (!row) {
    return {
      notifications: { ...DEFAULT_OPS_NOTIFICATIONS },
      thresholds: { ...DEFAULT_THRESHOLDS },
    };
  }
  return {
    notifications: { ...DEFAULT_OPS_NOTIFICATIONS, ...row.opsNotifications },
    thresholds: { ...DEFAULT_THRESHOLDS, ...row.thresholds },
  };
}
