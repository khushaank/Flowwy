package com.khush.flowwy;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.widget.Toast; // DEBUG TOAST
import androidx.core.app.NotificationCompat;
import java.util.Random;

public class NotificationReceiver extends BroadcastReceiver {

    private static final String[] QUOTES = {
        "Believe you can and you're halfway there.",
        "Your only limit is your mind.",
        "Do it now. Sometimes 'later' becomes 'never'.",
        "Dream it. Wish it. Do it.",
        "Success doesn't just find you. You have to go out and get it.",
        "The harder you work for something, the greater you'll feel when you achieve it.",
        "Don't stop when you're tired. Stop when you're done.",
        "Wake up with determination. Go to bed with satisfaction.",
        "Do something today that your future self will thank you for.",
        "Little things make big days.",
        "It’s going to be hard, but hard does not mean impossible.",
        "Don't wait for opportunity. Create it.",
        "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
        "The key to success is to focus on goals, not obstacles.",
        "Dream bigger. Do bigger.",
        "Don't tell people your plans. Show them your results.",
        "Small steps in the right direction can turn out to be the biggest step of your life.",
        "If it was easy, everyone would do it.",
        "Be the energy you want to attract.",
        "Focus on being productive instead of busy."
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        // DEBUG: Popup to prove code is running
        // If you see this but no notification, it's a PERMISSION issue.
        // Toast.makeText(context, "Flowwy Notification Triggered!", Toast.LENGTH_SHORT).show();
        
        showNotification(context);
    }

    private void showNotification(Context context) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "flowwy_motivation_channel";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                channelId,
                "Daily Motivation",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            notificationManager.createNotificationChannel(channel);
        }

        String quote = QUOTES[new Random().nextInt(QUOTES.length)];

        Intent tapIntent = new Intent(context, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            tapIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int iconResId = context.getResources().getIdentifier("khush", "drawable", context.getPackageName());
        Bitmap largeIcon = null;
        if (iconResId != 0) {
            largeIcon = BitmapFactory.decodeResource(context.getResources(), iconResId);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                // Use a system icon that is GUARANTEED to exist to avoid crash
                .setSmallIcon(android.R.drawable.ic_dialog_info) 
                .setContentTitle("Flowwy")
                .setContentText(quote)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(quote))
                .setPriority(NotificationCompat.PRIORITY_MAX) // MAX PRIORITY
                .setCategory(NotificationCompat.CATEGORY_EVENT)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL);

        if (largeIcon != null) {
            builder.setLargeIcon(largeIcon);
        }

        notificationManager.notify(new Random().nextInt(10000), builder.build());
    }
}
