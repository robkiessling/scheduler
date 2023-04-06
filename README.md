# Class Scheduler

_Note: this tool is used to generate potential class schedules for a particular elementary
school; it has a very specific set of criteria. It is not meant to be used as a generic scheduler._ 

## Webpage

The scheduler is hosted on github pages and can be accessed at:
[https://robkiessling.github.io/scheduler/](https://robkiessling.github.io/scheduler/).

On the webpage, there is a configuration section on the left side of the screen.
This allows a user to modify the configurable parameters of the schedule, such as the
names/number of classes and subjects. 

After a configuration has been made, click the `Generate` button to generate a new schedule.
This populates the view on the right side of the screen. There are several tabs providing 
different ways of viewing the generated schedule. In the Master Schedule, articulation 
periods are shown using bold font (see next section for more info on articulation periods). 

There are a lot of random components involved when generating a schedule, such as the order
in which the subjects and classes are assigned. As such, each time you click the
`Generate` button a different schedule will be created (but still adhering to the desired
configuration). A common way to use this tool is to keep regenerating the schedule
until you see one that looks satisfactory. 

You can click the `Download` button to download the currently viewed schedule tab. This downloads
an `.xls` file that can be opened by Microsoft Excel. Note that `.xls` is an older format, so
Excel may show a warning when opening the file. The file can also be opened by
Google Sheets if you are having trouble with Excel.

## Criteria

As mentioned in the introduction, this scheduler lays out classes according to a very 
specific set of criteria:
- The school has several "specials" subjects, such as art, music, or library. 
Each subject has a single teacher, so sometimes the terms "subject" and "teacher" are used
interchangeably. 
  - The names and total number of subjects needs to be configurable. 
  - Certain teachers have a limited schedule, so there needs to be a way to exclude certain
  hours for each teacher
  - Some subjects only apply to certain grade levels, so there needs to be a way to exclude
  grades for each subject. 
- The grades are: Preschool, Kindergarten, and 1st through 6th grade. 
  - Each grade has 1 or more classes. The names and number of classes needs to be configurable.
- Each class needs to see each special once per week.
- There are 7 periods throughout the school day, except for Wednesday which has 6 (ends early).
- During the week, each grade needs 2 consecutive periods where all classes in the grade
are at a special. These are referred to as "articulation" (or "ARTIC") periods, and their
purpose is to allow all teachers in the grade to have a time to meet together. 
  - These consecutive articulation periods cannot cross the recess break.
- There needs to be 1 period blocked off where none of the specials have
class. This is known as "specials articulation" and its purpose is to provide a time for
all the specials teachers to meet together.
- Tues/Wed/Thurs periods should be prioritized over Monday/Friday. This reduces the number of 
classes that have to be rescheduled when holidays occur. 
- Each specials teacher needs a lunch break during the day. Ideally the lunch break occurs in
period 5 (11:45 - 12:25), but period 4 can be a fallback.
- When possible, it is nice if a specials teacher can teach the same grade level 
during consecutive periods. This makes it easier so they don't have to change
curriculum as often between periods. This should be considered low priority. 

