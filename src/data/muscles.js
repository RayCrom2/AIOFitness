// Simple slug-keyed muscle dictionary for prototype usage
// Keys are base slugs (no .left or .right). Keep it small; expand as needed.
const muscles = {
  deltoids: {
    slug: 'deltoids',
    name: 'Deltoids',
    description:
      'The deltoid muscles form the rounded contour of the shoulder and are important for overhead pressing, abduction, and rotation of the arm.',
    tips:
      'Warm up with light rotations and band work. Prioritize form on overhead pressing to protect the shoulder joint.',
    exercises: ['Overhead press', 'Lateral raises', 'Rear delt fly'],
    contraindications: ['Avoid heavy overhead work with existing impingement'],
    parts: [
      {
        key: 'anterior',
        name: 'Anterior Deltoid (Front)',
        description:
          'The anterior deltoid is the front portion of the deltoid group; it assists with shoulder flexion and horizontal adduction and is emphasized by pressing movements with a forward angle.',
        exercises: ['Front raise', 'Incline press', 'Arnold press'],
        tips: 'Control the eccentric phase and avoid excessive internal rotation under heavy loads.',
      },
      {
        key: 'lateral',
        name: 'Lateral Deltoid (Middle)',
        description:
          'The lateral (middle) deltoid creates shoulder abduction and the rounded shoulder appearance; it is emphasized by lateral raises and wide pressing paths.',
        exercises: ['Lateral raises', 'Upright rows (light)', 'Cable lateral'],
        tips: 'Use strict form on lateral raises to isolate the lateral head; avoid heavy momentum.',
      },
      {
        key: 'posterior',
        name: 'Posterior Deltoid (Rear)',
        description:
          'The posterior deltoid is the rear portion important for horizontal abduction and external rotation and contributes to posture and pulling balance.',
        exercises: ['Rear delt fly', 'Face pull', 'Bent-over lateral raise'],
        tips: 'Prioritize scapular retraction and light, high-quality reps to target the posterior fibers.',
      },
    ],
  },

  chest: {
    slug: 'chest',
    name: 'Chest (Pectorals)',
    description:
      'Pectoral muscles produce pushing motions and stabilization for the shoulder girdle.',
    tips: 'Control the descent in pressing movements and keep scapulae engaged.',
    exercises: ['Bench press', 'Push-ups', 'Chest fly'],
    contraindications: ['Be cautious with heavy single-joint isolation if shoulder pain present'],
    parts: [
      {
        key: 'clavicular',
        name: 'Clavicular Head (Upper Chest)',
        description:
          'The clavicular head is the upper portion of the pectoralis major; it is emphasized by incline pressing and helps with shoulder flexion and horizontal adduction at higher angles.',
        exercises: ['Incline bench press', 'Incline dumbbell fly'],
        tips: 'Use controlled incline pressing with moderate range to target the upper fibers without overloading the shoulder.',
      },
      {
        key: 'sternal',
        name: 'Sternal Head (Lower Chest)',
        description:
          'The sternal head is the larger central/lower portion of the pectoralis major; it is emphasized by flat and decline pressing and is important in strong horizontal pressing.',
        exercises: ['Flat bench press', 'Cable crossover (low to high)'],
        tips: 'Focus on full, controlled presses and maintain scapular stability.',
      },
      {
        key: 'minor',
        name: 'Pectoralis Minor',
        description:
          'A smaller muscle underneath the pectoralis major that stabilizes the scapula and assists in protraction; often involved in scapular mechanics and shoulder pain patterns.',
        exercises: ['Scapular push-ups', 'Serratus punches (to support scapular control)'],
        tips: 'Work on scapular control and mobility; avoid pressing variations that provoke scapular discomfort.',
      },
    ],
  },

  back: {
    slug: 'back',
    name: 'Back (Latissimus, Trapezius, Rhomboids)',
    description:
      'The large posterior muscles responsible for pulling, posture, and scapular control.',
    tips: 'Train pulling movements with full scapular retraction; maintain spinal neutrality.',
    exercises: ['Pull-ups', 'Rows', 'Lat pulldown'],
    contraindications: ['Avoid heavy rounding under load if lower-back pain exists'],
  },

  arms: {
    slug: 'arms',
    name: 'Arms (Biceps & Triceps)',
    description:
      'Includes elbow flexors (biceps) and extensors (triceps), important for most upper-body lifts.',
    tips: 'Balance flexor and extensor work to avoid imbalances and elbow irritation.',
    exercises: ['Barbell curl', 'Triceps pushdown', 'Hammer curl'],
    contraindications: ['Be cautious with heavy overload after elbow tendonitis'],
  },

  core: {
    slug: 'core',
    name: 'Core (Abdominals & Stabilizers)',
    description:
      'The core stabilizes the spine and transmits force between upper and lower body.',
    tips: 'Prioritize bracing technique; start with isometric holds before complex loaded patterns.',
    exercises: ['Plank', 'Dead bug', 'Pallof press'],
    contraindications: ['Avoid Valsalva with uncontrolled hypertension'],
  },

  legs: {
    slug: 'legs',
    name: 'Legs (Quadriceps, Hamstrings, Glutes, Calves)',
    description:
      'Large lower-body muscle groups producing locomotion, knee/hip extension, and power.',
    tips: 'Balance squat and hinge patterns; progress range of motion before heavy loading.',
    exercises: ['Squat', 'Deadlift', 'Lunge', 'Calf raise'],
    contraindications: ['Modify heavy loading for knee or hip pathology'],
  },

  // A few more specific examples
  biceps: {
    slug: 'biceps',
    name: 'Biceps Brachii',
    description: 'Elbow flexor and supinator of the forearm; common focus of isolation work.',
    tips: 'Use controlled eccentric phase and avoid excessive swinging.',
    exercises: ['Dumbbell curl', 'Hammer curl'],
    contraindications: ['Limit heavy isolation with active biceps tendon pain'],
  },

  triceps: {
    slug: 'triceps',
    name: 'Triceps Brachii',
    description: 'Primary elbow extensors; important for pushing strength.',
    tips: 'Use full range of motion and keep elbows stable during pressing.',
    exercises: ['Triceps dip', 'Skull crusher'],
    contraindications: [],
  },
}

export default muscles
