export interface NotificationTemplateData {
  [key: string]: any;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  data?: NotificationTemplateData;
}
