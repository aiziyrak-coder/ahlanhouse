# Generated migration: Object.model_3d, RoomTypeModel, Apartment.segment_id

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('all', '0002_add_apartment_model_3d'),
    ]

    operations = [
        migrations.AddField(
            model_name='object',
            name='model_3d',
            field=models.FileField(blank=True, help_text='Asosiy obyekt (binoning tashqi) 3D modeli — bitta fayl, xonadonlar shundan segmentlarga ajratiladi', null=True, upload_to='object_3d/'),
        ),
        migrations.CreateModel(
            name='RoomTypeModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('room_count', models.PositiveIntegerField(unique=True)),
                ('model_3d', models.FileField(blank=True, null=True, upload_to='room_type_3d/')),
            ],
            options={
                'verbose_name': 'Xona turi 3D model',
                'verbose_name_plural': 'Xona turlari 3D modellar',
            },
        ),
        migrations.AddField(
            model_name='apartment',
            name='segment_id',
            field=models.CharField(blank=True, help_text="Asosiy obyekt modelidagi segment ID (masalan 1_1, 2_3) — xonadon shu segmentga biriktiriladi", max_length=64, null=True),
        ),
        migrations.RunPython(
            lambda apps, schema_editor: [apps.get_model('all', 'RoomTypeModel').objects.get_or_create(room_count=r, defaults={}) for r in (1, 2, 3, 4)],
            migrations.RunPython.noop,
        ),
    ]
