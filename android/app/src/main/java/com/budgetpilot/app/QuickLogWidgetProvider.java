package com.budgetpilot.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class QuickLogWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_log);

        // 1. +₹100 Quick Log Intent
        Intent intent100 = new Intent(Intent.ACTION_VIEW, Uri.parse("budgetpilot://quick-log?amount=100"), context, MainActivity.class);
        intent100.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi100 = PendingIntent.getActivity(context, 100, intent100, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_quick_100, pi100);

        // 2. +₹500 Quick Log Intent
        Intent intent500 = new Intent(Intent.ACTION_VIEW, Uri.parse("budgetpilot://quick-log?amount=500"), context, MainActivity.class);
        intent500.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi500 = PendingIntent.getActivity(context, 500, intent500, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_quick_500, pi500);

        // 3. +₹1000 Quick Log Intent
        Intent intent1000 = new Intent(Intent.ACTION_VIEW, Uri.parse("budgetpilot://quick-log?amount=1000"), context, MainActivity.class);
        intent1000.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi1000 = PendingIntent.getActivity(context, 1000, intent1000, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_quick_1000, pi1000);

        // 4. +Custom / Open Form Intent
        Intent intentCustom = new Intent(Intent.ACTION_VIEW, Uri.parse("budgetpilot://action=add-expense"), context, MainActivity.class);
        intentCustom.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent piCustom = PendingIntent.getActivity(context, 1, intentCustom, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_quick_custom, piCustom);

        // Header click opens app
        Intent intentApp = new Intent(context, MainActivity.class);
        PendingIntent piApp = PendingIntent.getActivity(context, 0, intentApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, piApp);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
