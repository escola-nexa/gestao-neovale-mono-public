import { Module } from '@nestjs/common';
import { StorageModule } from './modules/storage/storage.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AlunoModule } from './modules/aluno/aluno.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolsModule } from './modules/schools/schools.module';

import { AcademicBimestersModule } from './modules/academic_bimesters/academic_bimesters.module';
import { AcademicCalendarsModule } from './modules/academic_calendars/academic_calendars.module';
import { AnnualClassOccurrencesModule } from './modules/annual_class_occurrences/annual_class_occurrences.module';
import { AttendanceRecordsModule } from './modules/attendance_records/attendance_records.module';
import { AuditEventsModule } from './modules/audit_events/audit_events.module';
import { BiMetricSnapshotsModule } from './modules/bi_metric_snapshots/bi_metric_snapshots.module';
import { BiQualityAuditResultsModule } from './modules/bi_quality_audit_results/bi_quality_audit_results.module';
import { BookletDeliveriesModule } from './modules/booklet_deliveries/booklet_deliveries.module';
import { BookletDeliveryAttachmentsModule } from './modules/booklet_delivery_attachments/booklet_delivery_attachments.module';
import { BookletDeliveryItemsModule } from './modules/booklet_delivery_items/booklet_delivery_items.module';
import { BookletDeliverySchoolsModule } from './modules/booklet_delivery_schools/booklet_delivery_schools.module';
import { BookletDeliveryUsersModule } from './modules/booklet_delivery_users/booklet_delivery_users.module';
import { BrandingSettingsModule } from './modules/branding_settings/branding_settings.module';
import { CalendarEventsModule } from './modules/calendar_events/calendar_events.module';
import { ChatChannelLabelAssignmentsModule } from './modules/chat_channel_label_assignments/chat_channel_label_assignments.module';
import { ChatChannelLabelsModule } from './modules/chat_channel_labels/chat_channel_labels.module';
import { ChatChannelMembersModule } from './modules/chat_channel_members/chat_channel_members.module';
import { ChatChannelsModule } from './modules/chat_channels/chat_channels.module';
import { ChatMessageAttachmentsModule } from './modules/chat_message_attachments/chat_message_attachments.module';
import { ChatMessageLabelAssignmentsModule } from './modules/chat_message_label_assignments/chat_message_label_assignments.module';
import { ChatMessageLabelsModule } from './modules/chat_message_labels/chat_message_labels.module';
import { ChatMessageMentionsModule } from './modules/chat_message_mentions/chat_message_mentions.module';
import { ChatMessageReactionsModule } from './modules/chat_message_reactions/chat_message_reactions.module';
import { ChatMessageReadsModule } from './modules/chat_message_reads/chat_message_reads.module';
import { ChatMessageTicketsModule } from './modules/chat_message_tickets/chat_message_tickets.module';
import { ChatMessagesModule } from './modules/chat_messages/chat_messages.module';
import { ChatSavedMessagesModule } from './modules/chat_saved_messages/chat_saved_messages.module';
import { ChatUserInboxStateModule } from './modules/chat_user_inbox_state/chat_user_inbox_state.module';
import { CitiesModule } from './modules/cities/cities.module';
import { ClassGroupsModule } from './modules/class_groups/class_groups.module';
import { ClassSubjectModalityModule } from './modules/class_subject_modality/class_subject_modality.module';
import { CourseSchoolsModule } from './modules/course_schools/course_schools.module';
import { CoursesModule } from './modules/courses/courses.module';
import { DigitalSignaturesModule } from './modules/digital_signatures/digital_signatures.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { ExternalAccessLogsModule } from './modules/external_access_logs/external_access_logs.module';
import { ExternalLinksModule } from './modules/external_links/external_links.module';
import { FinancialAccountsModule } from './modules/financial_accounts/financial_accounts.module';
import { FinancialApprovalLimitsModule } from './modules/financial_approval_limits/financial_approval_limits.module';
import { FinancialApprovalPoliciesModule } from './modules/financial_approval_policies/financial_approval_policies.module';
import { FinancialApprovalStepsModule } from './modules/financial_approval_steps/financial_approval_steps.module';
import { FinancialApprovalsModule } from './modules/financial_approvals/financial_approvals.module';
import { FinancialAttachmentsModule } from './modules/financial_attachments/financial_attachments.module';
import { FinancialBankTransactionsModule } from './modules/financial_bank_transactions/financial_bank_transactions.module';
import { FinancialBudgetLinesModule } from './modules/financial_budget_lines/financial_budget_lines.module';
import { FinancialBudgetsModule } from './modules/financial_budgets/financial_budgets.module';
import { FinancialCategoriesModule } from './modules/financial_categories/financial_categories.module';
import { FinancialChargeRulesModule } from './modules/financial_charge_rules/financial_charge_rules.module';
import { FinancialClosureAuditModule } from './modules/financial_closure_audit/financial_closure_audit.module';
import { FinancialCostCentersModule } from './modules/financial_cost_centers/financial_cost_centers.module';
import { FinancialDocumentTypesModule } from './modules/financial_document_types/financial_document_types.module';
import { FinancialEntriesModule } from './modules/financial_entries/financial_entries.module';
import { FinancialEntryAllocationsModule } from './modules/financial_entry_allocations/financial_entry_allocations.module';
import { FinancialImportBatchesModule } from './modules/financial_import_batches/financial_import_batches.module';
import { FinancialInstallmentsModule } from './modules/financial_installments/financial_installments.module';
import { FinancialPartiesModule } from './modules/financial_parties/financial_parties.module';
import { FinancialPartyBankAccountsModule } from './modules/financial_party_bank_accounts/financial_party_bank_accounts.module';
import { FinancialPartyBankHistoryModule } from './modules/financial_party_bank_history/financial_party_bank_history.module';
import { FinancialPaymentBatchItemsModule } from './modules/financial_payment_batch_items/financial_payment_batch_items.module';
import { FinancialPaymentBatchesModule } from './modules/financial_payment_batches/financial_payment_batches.module';
import { FinancialPaymentMethodsModule } from './modules/financial_payment_methods/financial_payment_methods.module';
import { FinancialPaymentTermsModule } from './modules/financial_payment_terms/financial_payment_terms.module';
import { FinancialPaymentsModule } from './modules/financial_payments/financial_payments.module';
import { FinancialPeriodClosuresModule } from './modules/financial_period_closures/financial_period_closures.module';
import { FinancialPermissionAuditLogsModule } from './modules/financial_permission_audit_logs/financial_permission_audit_logs.module';
import { FinancialPermissionsModule } from './modules/financial_permissions/financial_permissions.module';
import { FinancialProjectsModule } from './modules/financial_projects/financial_projects.module';
import { FinancialReconciliationsModule } from './modules/financial_reconciliations/financial_reconciliations.module';
import { FinancialRoleTemplatePermissionsModule } from './modules/financial_role_template_permissions/financial_role_template_permissions.module';
import { FinancialRoleTemplatesModule } from './modules/financial_role_templates/financial_role_templates.module';
import { FinancialSettingsModule } from './modules/financial_settings/financial_settings.module';
import { FinancialSettingsAuditModule } from './modules/financial_settings_audit/financial_settings_audit.module';
import { FinancialSourceLinksModule } from './modules/financial_source_links/financial_source_links.module';
import { FinancialTransfersModule } from './modules/financial_transfers/financial_transfers.module';
import { FinancialUserPermissionsModule } from './modules/financial_user_permissions/financial_user_permissions.module';
import { FinancialUserScopesModule } from './modules/financial_user_scopes/financial_user_scopes.module';
import { FolhaPontoGeneratedLogModule } from './modules/folha_ponto_generated_log/folha_ponto_generated_log.module';
import { FormativeTracksModule } from './modules/formative_tracks/formative_tracks.module';
import { GradeActivitiesModule } from './modules/grade_activities/grade_activities.module';
import { GradeConfigurationsModule } from './modules/grade_configurations/grade_configurations.module';
import { HelpTutorialViewsModule } from './modules/help_tutorial_views/help_tutorial_views.module';
import { HelpTutorialsModule } from './modules/help_tutorials/help_tutorials.module';
import { HrAllocationItemsModule } from './modules/hr_allocation_items/hr_allocation_items.module';
import { HrAllocationPlansModule } from './modules/hr_allocation_plans/hr_allocation_plans.module';
import { HrHiringAuditLogsModule } from './modules/hr_hiring_audit_logs/hr_hiring_audit_logs.module';
import { HrHiringCandidatesModule } from './modules/hr_hiring_candidates/hr_hiring_candidates.module';
import { HrHiringDocumentsModule } from './modules/hr_hiring_documents/hr_hiring_documents.module';
import { HrIndicationClassesModule } from './modules/hr_indication_classes/hr_indication_classes.module';
import { HrIndicationDraftsModule } from './modules/hr_indication_drafts/hr_indication_drafts.module';
import { HrLinkSubjectBimesterFilterModule } from './modules/hr_link_subject_bimester_filter/hr_link_subject_bimester_filter.module';
import { HrSchoolIndicationsModule } from './modules/hr_school_indications/hr_school_indications.module';
import { HrSettingsModule } from './modules/hr_settings/hr_settings.module';
import { HrSubjectUcpOverridesModule } from './modules/hr_subject_ucp_overrides/hr_subject_ucp_overrides.module';
import { ImportBatchRowsModule } from './modules/import_batch_rows/import_batch_rows.module';
import { ImportBatchesModule } from './modules/import_batches/import_batches.module';
import { KanbanListsModule } from './modules/kanban_lists/kanban_lists.module';
import { LessonMaterialsModule } from './modules/lesson_materials/lesson_materials.module';
import { LibraryCategoriesModule } from './modules/library_categories/library_categories.module';
import { LibraryContentFoldersModule } from './modules/library_content_folders/library_content_folders.module';
import { LibraryContentsModule } from './modules/library_contents/library_contents.module';
import { LibraryFoldersModule } from './modules/library_folders/library_folders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OnesignalSendLogModule } from './modules/onesignal_send_log/onesignal_send_log.module';
import { OnesignalSettingsModule } from './modules/onesignal_settings/onesignal_settings.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { OrientationsModule } from './modules/orientations/orientations.module';
import { PlanningAuditLogModule } from './modules/planning_audit_log/planning_audit_log.module';
import { PlanningFeedbackHistoryModule } from './modules/planning_feedback_history/planning_feedback_history.module';
import { PlanningTemplatesModule } from './modules/planning_templates/planning_templates.module';
import { PrePlanningMaterialsModule } from './modules/pre_planning_materials/pre_planning_materials.module';
import { PrePlanningsModule } from './modules/pre_plannings/pre_plannings.module';
import { ProfessorChildrenModule } from './modules/professor_children/professor_children.module';
import { ProfessorContactLogsModule } from './modules/professor_contact_logs/professor_contact_logs.module';
import { ProfessorDocumentFilesModule } from './modules/professor_document_files/professor_document_files.module';
import { ProfessorDocumentsModule } from './modules/professor_documents/professor_documents.module';
import { ProfessorKanbanLabelsModule } from './modules/professor_kanban_labels/professor_kanban_labels.module';
import { ProfessorKanbanStateModule } from './modules/professor_kanban_state/professor_kanban_state.module';
import { ProfessorMedicalReportsModule } from './modules/professor_medical_reports/professor_medical_reports.module';
import { ProfessorSchoolCoursesModule } from './modules/professor_school_courses/professor_school_courses.module';
import { ProfessorStatusHistoryModule } from './modules/professor_status_history/professor_status_history.module';
import { ProfessorUnbindingHistoryModule } from './modules/professor_unbinding_history/professor_unbinding_history.module';
import { ProfessorsModule } from './modules/professors/professors.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PwaPushedNotificationsModule } from './modules/pwa_pushed_notifications/pwa_pushed_notifications.module';
import { PwaSettingsModule } from './modules/pwa_settings/pwa_settings.module';
import { QuarterlyKeywordsModule } from './modules/quarterly_keywords/quarterly_keywords.module';
import { SchoolTimeSlotsModule } from './modules/school_time_slots/school_time_slots.module';
import { SchoolVisitAttachmentsModule } from './modules/school_visit_attachments/school_visit_attachments.module';
import { SchoolVisitParticipantsModule } from './modules/school_visit_participants/school_visit_participants.module';
import { SchoolVisitRecordsModule } from './modules/school_visit_records/school_visit_records.module';
import { SchoolVisitSchoolsModule } from './modules/school_visit_schools/school_visit_schools.module';
import { SchoolVisitUsersModule } from './modules/school_visit_users/school_visit_users.module';
import { SchoolVisitsModule } from './modules/school_visits/school_visits.module';
import { StatesModule } from './modules/states/states.module';
import { StudentGradesModule } from './modules/student_grades/student_grades.module';
import { StudentsModule } from './modules/students/students.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { SubstitutionDocumentsModule } from './modules/substitution_documents/substitution_documents.module';
import { SubstitutionPaymentsModule } from './modules/substitution_payments/substitution_payments.module';
import { SubstitutionRequestsModule } from './modules/substitution_requests/substitution_requests.module';
import { SubstitutionSettingsModule } from './modules/substitution_settings/substitution_settings.module';
import { SubstitutionStatusHistoryModule } from './modules/substitution_status_history/substitution_status_history.module';
import { TalentPoolCandidatesModule } from './modules/talent_pool_candidates/talent_pool_candidates.module';
import { TeacherAttendanceAdjustmentsModule } from './modules/teacher_attendance_adjustments/teacher_attendance_adjustments.module';
import { TeacherAttendanceAuditLogsModule } from './modules/teacher_attendance_audit_logs/teacher_attendance_audit_logs.module';
import { TeacherAttendanceClosureSignaturesModule } from './modules/teacher_attendance_closure_signatures/teacher_attendance_closure_signatures.module';
import { TeacherAttendanceEntriesModule } from './modules/teacher_attendance_entries/teacher_attendance_entries.module';
import { TeacherAttendanceMonthlySheetsModule } from './modules/teacher_attendance_monthly_sheets/teacher_attendance_monthly_sheets.module';
import { TeacherAttendanceSettingsModule } from './modules/teacher_attendance_settings/teacher_attendance_settings.module';
import { TeacherPlanningsModule } from './modules/teacher_plannings/teacher_plannings.module';
import { TeacherSubstitutionAuditLogsModule } from './modules/teacher_substitution_audit_logs/teacher_substitution_audit_logs.module';
import { TeacherSubstitutionCandidatesModule } from './modules/teacher_substitution_candidates/teacher_substitution_candidates.module';
import { TeacherSubstitutionDocumentsModule } from './modules/teacher_substitution_documents/teacher_substitution_documents.module';
import { TeacherSubstitutionFinancialAccessModule } from './modules/teacher_substitution_financial_access/teacher_substitution_financial_access.module';
import { TeacherSubstitutionOccurrencesModule } from './modules/teacher_substitution_occurrences/teacher_substitution_occurrences.module';
import { TeacherSubstitutionPaymentsModule } from './modules/teacher_substitution_payments/teacher_substitution_payments.module';
import { TeacherSubstitutionRequestsModule } from './modules/teacher_substitution_requests/teacher_substitution_requests.module';
import { TeacherSubstitutionSettingsModule } from './modules/teacher_substitution_settings/teacher_substitution_settings.module';
import { TeacherSubstitutionStatusHistoryModule } from './modules/teacher_substitution_status_history/teacher_substitution_status_history.module';
import { TicketAssigneesModule } from './modules/ticket_assignees/ticket_assignees.module';
import { TicketCategoriesModule } from './modules/ticket_categories/ticket_categories.module';
import { TicketChecklistItemsModule } from './modules/ticket_checklist_items/ticket_checklist_items.module';
import { TicketChecklistsModule } from './modules/ticket_checklists/ticket_checklists.module';
import { TicketLabelAssignmentsModule } from './modules/ticket_label_assignments/ticket_label_assignments.module';
import { TicketLabelsModule } from './modules/ticket_labels/ticket_labels.module';
import { TicketMessagesModule } from './modules/ticket_messages/ticket_messages.module';
import { TicketWatchersModule } from './modules/ticket_watchers/ticket_watchers.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { UserActivitySummaryModule } from './modules/user_activity_summary/user_activity_summary.module';
import { UserNotificationPrefsModule } from './modules/user_notification_prefs/user_notification_prefs.module';
import { UserRolesModule } from './modules/user_roles/user_roles.module';
import { VisitRouteAiRecommendationsModule } from './modules/visit_route_ai_recommendations/visit_route_ai_recommendations.module';
import { VisitRouteCitiesModule } from './modules/visit_route_cities/visit_route_cities.module';
import { VisitRouteLogsModule } from './modules/visit_route_logs/visit_route_logs.module';
import { VisitRouteSchoolsModule } from './modules/visit_route_schools/visit_route_schools.module';
import { VisitRoutesModule } from './modules/visit_routes/visit_routes.module';
import { WebhookDeliveriesModule } from './modules/webhook_deliveries/webhook_deliveries.module';
import { WebhookEventsModule } from './modules/webhook_events/webhook_events.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WeeklyTeachingModelsModule } from './modules/weekly_teaching_models/weekly_teaching_models.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { FrequenciaModule } from './modules/frequencia/frequencia.module';
import { RhModule } from './modules/rh/rh.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres_password',
      database: process.env.DB_NAME || 'sigeo_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // OBRIGATÓRIO: Sincronização via migrations
      migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      migrationsRun: false,
    }),
    StorageModule,
    AlunoModule,
    AuthModule,
    SchoolsModule,
    AcademicBimestersModule,
    AcademicCalendarsModule,
    AnnualClassOccurrencesModule,
    AttendanceRecordsModule,
    AuditEventsModule,
    BiMetricSnapshotsModule,
    BiQualityAuditResultsModule,
    BookletDeliveriesModule,
    BookletDeliveryAttachmentsModule,
    BookletDeliveryItemsModule,
    BookletDeliverySchoolsModule,
    BookletDeliveryUsersModule,
    BrandingSettingsModule,
    CalendarEventsModule,
    ChatChannelLabelAssignmentsModule,
    ChatChannelLabelsModule,
    ChatChannelMembersModule,
    ChatChannelsModule,
    ChatMessageAttachmentsModule,
    ChatMessageLabelAssignmentsModule,
    ChatMessageLabelsModule,
    ChatMessageMentionsModule,
    ChatMessageReactionsModule,
    ChatMessageReadsModule,
    ChatMessageTicketsModule,
    ChatMessagesModule,
    ChatSavedMessagesModule,
    ChatUserInboxStateModule,
    CitiesModule,
    ClassGroupsModule,
    ClassSubjectModalityModule,
    CourseSchoolsModule,
    CoursesModule,
    DigitalSignaturesModule,
    EnrollmentsModule,
    ExternalAccessLogsModule,
    ExternalLinksModule,
    FinancialAccountsModule,
    FinancialApprovalLimitsModule,
    FinancialApprovalPoliciesModule,
    FinancialApprovalStepsModule,
    FinancialApprovalsModule,
    FinancialAttachmentsModule,
    FinancialBankTransactionsModule,
    FinancialBudgetLinesModule,
    FinancialBudgetsModule,
    FinancialCategoriesModule,
    FinancialChargeRulesModule,
    FinancialClosureAuditModule,
    FinancialCostCentersModule,
    FinancialDocumentTypesModule,
    FinancialEntriesModule,
    FinancialEntryAllocationsModule,
    FinancialImportBatchesModule,
    FinancialInstallmentsModule,
    FinancialPartiesModule,
    FinancialPartyBankAccountsModule,
    FinancialPartyBankHistoryModule,
    FinancialPaymentBatchItemsModule,
    FinancialPaymentBatchesModule,
    FinancialPaymentMethodsModule,
    FinancialPaymentTermsModule,
    FinancialPaymentsModule,
    FinancialPeriodClosuresModule,
    FinancialPermissionAuditLogsModule,
    FinancialPermissionsModule,
    FinancialProjectsModule,
    FinancialReconciliationsModule,
    FinancialRoleTemplatePermissionsModule,
    FinancialRoleTemplatesModule,
    FinancialSettingsModule,
    FinancialSettingsAuditModule,
    FinancialSourceLinksModule,
    FinancialTransfersModule,
    FinancialUserPermissionsModule,
    FinancialUserScopesModule,
    FolhaPontoGeneratedLogModule,
    FormativeTracksModule,
    GradeActivitiesModule,
    GradeConfigurationsModule,
    HelpTutorialViewsModule,
    HelpTutorialsModule,
    HrAllocationItemsModule,
    HrAllocationPlansModule,
    HrHiringAuditLogsModule,
    HrHiringCandidatesModule,
    HrHiringDocumentsModule,
    HrIndicationClassesModule,
    HrIndicationDraftsModule,
    HrLinkSubjectBimesterFilterModule,
    HrSchoolIndicationsModule,
    HrSettingsModule,
    HrSubjectUcpOverridesModule,
    ImportBatchRowsModule,
    ImportBatchesModule,
    KanbanListsModule,
    LessonMaterialsModule,
    LibraryCategoriesModule,
    LibraryContentFoldersModule,
    LibraryContentsModule,
    LibraryFoldersModule,
    NotificationsModule,
    OnesignalSendLogModule,
    OnesignalSettingsModule,
    OrganizationsModule,
    OrientationsModule,
    PlanningAuditLogModule,
    PlanningFeedbackHistoryModule,
    PlanningTemplatesModule,
    PrePlanningMaterialsModule,
    PrePlanningsModule,
    ProfessorChildrenModule,
    ProfessorContactLogsModule,
    ProfessorDocumentFilesModule,
    ProfessorDocumentsModule,
    ProfessorKanbanLabelsModule,
    ProfessorKanbanStateModule,
    ProfessorMedicalReportsModule,
    ProfessorSchoolCoursesModule,
    ProfessorStatusHistoryModule,
    ProfessorUnbindingHistoryModule,
    ProfessorsModule,
    ProfilesModule,
    PwaPushedNotificationsModule,
    PwaSettingsModule,
    QuarterlyKeywordsModule,
    SchoolTimeSlotsModule,
    SchoolVisitAttachmentsModule,
    SchoolVisitParticipantsModule,
    SchoolVisitRecordsModule,
    SchoolVisitSchoolsModule,
    SchoolVisitUsersModule,
    SchoolVisitsModule,
    StatesModule,
    StudentGradesModule,
    StudentsModule,
    SubjectsModule,
    SubstitutionDocumentsModule,
    SubstitutionPaymentsModule,
    SubstitutionRequestsModule,
    SubstitutionSettingsModule,
    SubstitutionStatusHistoryModule,
    TalentPoolCandidatesModule,
    TeacherAttendanceAdjustmentsModule,
    TeacherAttendanceAuditLogsModule,
    TeacherAttendanceClosureSignaturesModule,
    TeacherAttendanceEntriesModule,
    TeacherAttendanceMonthlySheetsModule,
    TeacherAttendanceSettingsModule,
    TeacherPlanningsModule,
    TeacherSubstitutionAuditLogsModule,
    TeacherSubstitutionCandidatesModule,
    TeacherSubstitutionDocumentsModule,
    TeacherSubstitutionFinancialAccessModule,
    TeacherSubstitutionOccurrencesModule,
    TeacherSubstitutionPaymentsModule,
    TeacherSubstitutionRequestsModule,
    TeacherSubstitutionSettingsModule,
    TeacherSubstitutionStatusHistoryModule,
    TicketAssigneesModule,
    TicketCategoriesModule,
    TicketChecklistItemsModule,
    TicketChecklistsModule,
    TicketLabelAssignmentsModule,
    TicketLabelsModule,
    TicketMessagesModule,
    TicketWatchersModule,
    TicketsModule,
    UserActivitySummaryModule,
    UserNotificationPrefsModule,
    UserRolesModule,
    VisitRouteAiRecommendationsModule,
    VisitRouteCitiesModule,
    VisitRouteLogsModule,
    VisitRouteSchoolsModule,
    VisitRoutesModule,
    WebhookDeliveriesModule,
    WebhookEventsModule,
    WebhooksModule,
    WeeklyTeachingModelsModule,
    EvaluationsModule,
    FrequenciaModule,
    RhModule,
    FinanceiroModule,
    DashboardModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
