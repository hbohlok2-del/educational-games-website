window.I18N_DICTIONARIES = {
  en: {
    common: {
      langLabel: "Language",
      backLabel: "Back",
      copy: "Copy code",
      copied: "Copied!",
      back: "← Back"
    },
    errors: {
      roomNotFound: "No match found with that code.",
      invalidTeam: "Invalid team.",
      teamTaken: "That team is already taken.",
      noQuestions: "Add at least one valid question first.",
      badPasscode: "Incorrect teacher passcode.",
      passcodeNotConfigured: "Saved quizzes are locked until the site's teacher passcode is set.",
      notFound: "That item no longer exists.",
      gameStarted: "This game has already started."
    },
    hub: {
      title: "Educational Games",
      nav: {
        home: "Home",
        play: "Play",
        create: "Create",
        notes: "Course Notes"
      },
      hero: {
        eyebrow: "Big curiosity. Shared discovery.",
        title1: "Learn seriously.",
        title2: "Play together.",
        lede: "Live classroom team games and clear course notes for grades 4 to 12."
      },
      join: {
        eyebrow: "For students",
        title: "Your class is waiting.",
        desc: "Enter the 4-letter code from your classroom screen.",
        label: "Room code",
        placeholder: "Room code",
        button: "Join a game",
        hint: "No account needed. Just pick your team."
      },
      sectionTitle: "A great lesson starts here.",
      sectionNote: "No downloads. No accounts.",
      card: {
        play: {
          eyebrow: "For students · Play",
          title: "Play a Game",
          desc: "Join a game that's running now, or pick a saved quiz from your teachers and start a new match.",
          link: "Open Play"
        },
        create: {
          eyebrow: "For teachers · Create",
          title: "Create a Game",
          desc: "Write your own questions for any subject, or start a quick Number Haul math match.",
          link: "Open the editor"
        },
        courseNotes: {
          eyebrow: "For everyone · Learn",
          title: "Course Notes",
          desc: "Math, physics, and chemistry notes with properly typeset equations. Read them straight, or borrow a problem for a game.",
          link: "Explore Course Notes"
        }
      },
      spotlight: {
        eyebrow: "In the spotlight · Math",
        title: "Solving quadratic equations.",
        desc: "Completing the square and the quadratic formula.",
        link: "Read the lesson"
      },
      footer: {
        left: "Educational Games · Made for classroom curiosity.",
        right: "Learn together. Play kindly."
      }
    },
    play: {
      title: "Team Games",
      eyebrow: "Students and teachers",
      heroTitle: "Play together.",
      lede: "Join a game that's open now, or start a new match from a quiz your teachers have saved.",
      role: {
        join: { title: "Join a Game", desc: "Got a room code from your teacher? Enter it here and pick your team.", button: "Join a Game" },
        bigScreen: { title: "Big Screen", desc: "Put the game up on a projector for the whole class to watch.", button: "Big Screen" }
      },
      lookup: {
        back: "← Back",
        label: "Enter the 4-letter room code",
        labelBigScreen: "Enter the code to put on the Big Screen",
        placeholder: "----",
        button: "Find Room",
        errShort: "Enter the 4-letter code.",
        errNotFound: "No match found with that code."
      },
      lobby: {
        heading: "Open games right now",
        empty: "No games are open right now.",
        join: "Join",
        bigScreen: "Big Screen",
        waiting: "Waiting",
        playing: "Playing"
      },
      tabs: { active: "Active Games", all: "All Games" },
      library: {
        heading: "Saved games from teachers",
        empty: "No saved games yet.",
        unavailable: "Saved games aren't available right now.",
        play: "Play",
        launchFailed: "Couldn't start that game. Try again.",
        questionSingular: "{{n}} question",
        questionPlural: "{{n}} questions"
      },
      notice: {
        connectError: "Can't reach the game server right now. Check your connection and reload."
      }
    },
    teacher: {
      lede: "Write your own questions for any subject, with math and science notation, and get a room code your students join from any device.",
      eyebrow: "Teacher workspace",
      setup: { heading: "Game setup" },
      field: { title: "Game title", titlePlaceholder: "e.g. Chapter 6 Vocabulary", gameType: "Game type", theme: "Theme" },
      mechanic: { race: "Race", buzzer: "Buzzer", board: "Board" },
      addQuestion: "+ Add question",
      createRoom: "Create Room",
      done: {
        shareLabel: "Share this code with your students",
        lede: "Students go to {{link}}, enter the code above, then pick a team.",
        openStudentView: "Open student join page",
        createAnother: "Create another game",
        buzzerHint: "This is a buzzer game. Open the Big Screen link and project it for the whole class; teams buzz in from their own devices.",
        boardHint: "This is a board game. Open the Big Screen link and project it: the host picks squares and judges open answers there, while teams answer from their own devices."
      },
      q: {
        remove: "Remove question",
        promptPlaceholder: "Question text -- use a toolbar button to insert math, or type $...$ yourself",
        previewPlaceholder: "Preview will appear here",
        shortAnswer: "Short answer",
        multipleChoice: "Multiple choice",
        correctAnswer: "Correct answer",
        correctAnswerPlaceholder: "e.g. Paris, or 42",
        choicesLabel: "Choices (mark the correct one)",
        addChoice: "+ Add choice",
        numbered: "Question {{n}}",
        choiceTextPlaceholder: "Choice text",
        category: "Category",
        categoryPlaceholder: "e.g. Fractions",
        points: "Points",
        openAnswer: "Open answer (teacher judges)",
        expectedAnswer: "Expected answer"
      },
      themes: { rope: "Tug of War", rocket: "Rocket Race", spotlight: "Spotlight Showdown", classic: "Quiz Board" },
      templates: { fraction: "Fraction", exponent: "Exponent", squareRoot: "Square root", chemistry: "Chemistry" },
      err: {
        questionNeedsText: "Question {{n}} needs text.",
        questionNeedsChoices: "Question {{n}} needs at least 2 choices.",
        questionNeedsCorrectChoice: "Question {{n}}: mark which choice is correct.",
        questionNeedsAnswer: "Question {{n}} needs a correct answer.",
        questionNeedsCategory: "Question {{n}} needs a category.",
        needOneQuestion: "Add at least one complete question.",
        createFailed: "Couldn't create the room."
      },
      board: { penalty: "Wrong answers lose points", timeLimit: "Time per question", seconds: "{{n}} s", teams: "Number of teams", teamCount: "{{n}} teams" },
      choose: {
        heading: "What would you like to create?",
        custom: { title: "Write your own questions", desc: "Any subject, race or buzzer format, with math and science notation." },
        numberHaul: { title: "Number Haul", desc: "A quick math tug-of-war. Questions are generated automatically, no setup needed." }
      },
      passcode: { label: "Teacher passcode", placeholder: "Enter the teacher passcode", hint: "Needed to load, save, edit or delete saved quizzes.", button: "Unlock", ok: "Unlocked" },
      library: {
        saveButton: "Save for later",
        saved: "Saved!",
        updateButton: "Update Quiz",
        updated: "Updated!",
        loadButton: "Load a saved quiz",
        heading: "Saved Quizzes",
        empty: "No saved quizzes yet.",
        close: "Close",
        load: "Load",
        delete: "Delete",
        questionSingular: "{{n}} question",
        questionPlural: "{{n}} questions",
        unavailable: "Saved quizzes aren't available right now."
      }
    },
    lessons: {
      brand: "Educational Games",
      nav: "Course Notes",
      pickSubject: "Pick a subject",
      empty: "No lessons have been published yet.",
      emptySubject: "No lessons here yet.",
      notFoundTitle: "Not found",
      notFoundBody: "There's no lesson at this address yet.",
      subjects: { math: "Math", physics: "Physics", chemistry: "Chemistry" },
      lede: "Clear explanations and worked examples, with properly typeset equations.",
      openSubject: "Open notes",
      read: "Read",
      inThisNote: "In this note",
      allNotes: "All Course Notes",
      readTime: "{{n}} min read",
      play: {
        eyebrow: "Learn → Play",
        title: "Put the idea into play.",
        desc: "Turn this note into a team game for your class.",
        button: "Open the editor"
      }
    },
    games: {
      tugOfWar: {
        title: "Number Haul",
        eyebrow: "a math tug-of-war",
        heroTitle: "Number Haul",
        lede: "Two teams, two devices, one rope. Solve arithmetic fast and accurately to haul the flag across the line before the other side does.",
        role: {
          create: { title: "Start a Match", desc: "Pick a difficulty, get a room code, and invite the other team.", button: "Start a Match" },
          join: { title: "Join a Match", desc: "Got a room code from your teacher or the other team? Jump in here.", button: "Join a Match" },
          bigScreen: { title: "Big Screen", desc: "Put the rope and live scores up on a projector for everyone to see.", button: "Big Screen" }
        },
        howto: "<b>How scoring works:</b> a correct answer hauls the rope toward your side: 10 points in under 5 seconds, 7 points between 5-10 seconds, 5 points past that. A wrong answer earns nothing and costs you a moment before your next question, so speed only pays off when you're also right. First team to pull the flag past their line wins the haul.",
        create: { chooseDifficulty: "1. Choose difficulty", pickTeam: "2. Pick your team", redTeam: "▲ Red Team", blueTeam: "◆ Blue Team", createRoom: "Create Room" },
        join: { label: "Enter the 4-letter room code", findRoom: "Find Room", roomLabel: "Room", joinRed: "▲ Join Red", joinBlue: "◆ Join Blue", watchBigScreen: "Watch on the Big Screen" },
        lobby: { difficulty: "Difficulty: {{tier}}", redTeam: "Red Team", blueTeam: "Blue Team", ready: "Ready", waiting: "Waiting…", startMatch: "Start Match", matchStarting: "Match starting…", waitingBothTeams: "Waiting for both teams…", leaveRoom: "Leave Room" },
        match: { redTag: "▲ RED", blueTag: "BLUE ◆", teamTagRed: "▲ RED TEAM", teamTagBlue: "◆ BLUE TEAM", streak: "Streak {{n}}", accuracy: "Accuracy {{value}}", haul: "Haul ✓" },
        display: { correct: "Correct", wrong: "Wrong", accuracy: "Accuracy" },
        end: { redWins: "Red Team hauls the win!", blueWins: "Blue Team hauls the win!", draw: "It's a draw!", rematch: "Rematch", newMatch: "New Match" },
        notice: { connectError: "Can't reach the game server right now. Check your connection and reload." },
        err: { createFailed: "Couldn't create room.", enterCode: "Enter the 4-letter code." },
        tiers: {
          rookie: { label: "Rookie", blurb: "Addition & subtraction, numbers up to 20" },
          varsity: { label: "Varsity", blurb: "+ − × ÷ and fractions, larger numbers" },
          champion: { label: "Champion", blurb: "Negatives, order of operations, exponents" }
        }
      },
      teamRace: {
        title: "Team Race",
        eyebrow: "a class team race",
        heroTitle: "Team Race",
        lede: "Two or four teams, one race. Answer your teacher's questions fast and accurately to pull ahead before the other teams do.",
        role: {
          join: { title: "Join a Race", desc: "Got a room code from your teacher? Enter it here and pick your team.", button: "Join a Race" },
          bigScreen: { title: "Big Screen", desc: "Put the race and live scores up on a projector for everyone to see.", button: "Big Screen" }
        },
        howto: "<b>How scoring works:</b> a correct answer pulls the marker toward your side, more for a fast answer, less for a slow one. A wrong answer earns nothing and costs you a moment before your next question. First team to pull the marker to their side wins the race.",
        join: { label: "Enter the 4-letter room code", findRoom: "Find Room", roomLabel: "Room", joinTeam: "Join {{team}}", watchBigScreen: "Watch on the Big Screen" },
        teams: { A: "Red Team", B: "Blue Team", C: "Green Team", D: "Purple Team" },
        defaultTitle: "Team Race",
        lobby: { questionSingular: "{{n}} question", questionPlural: "{{n}} questions", ready: "Ready", waiting: "Waiting…", startRace: "Start Race", startRaceTeams: "Start Race ({{n}} teams)", needTwoTeams: "Waiting for at least 2 teams…", matchStarting: "Match starting…", waitingBothTeams: "Waiting for both teams…", leaveRoom: "Leave Room" },
        match: { timeLeft: "Time left", redTag: "▲ RED", blueTag: "BLUE ◆", streak: "Streak {{n}}", accuracy: "Accuracy {{value}}", typeYourAnswer: "Type your answer", submit: "Submit" },
        display: { correct: "Correct", wrong: "Wrong", accuracy: "Accuracy" },
        end: { champions: "Today's champions", leaderboard: "Final leaderboard", noWinner: "No winner this time.", teamWins: "{{team}} wins the race!", draw: "It's a draw!", rematch: "Rematch", newRace: "New Race" },
        notice: { connectError: "Can't reach the game server right now. Check your connection and reload." },
        err: { enterCode: "Enter the 4-letter code." }
      },
      teamBoard: {
        title: "Quiz Board",
        eyebrow: "a classroom quiz board",
        heroTitle: "Quiz Board",
        lede: "Two to four teams, one board. Pick a square, answer on your device, and win its points.",
        role: {
          join: {
            title: "Join a Board Game",
            desc: "Got a room code from your teacher? Enter it here and pick your team.",
            button: "Join a Board Game"
          },
          bigScreen: {
            title: "Big Screen",
            desc: "Put the board up on a projector. The host picks squares and judges open answers from here.",
            button: "Big Screen"
          }
        },
        howto: "<b>How it works:</b> up to 4 teams can join. The team in control picks a square, and every team gets one answer. The first correct answer wins the square's points and control of the board. When every square is gone, the highest score wins.",
        join: {
          joinTeam: "Join {{team}}",
          label: "Enter the 4-letter room code",
          findRoom: "Find Room",
          roomLabel: "Room",
          watchBigScreen: "Watch on the Big Screen"
        },
        teams: {
          A: "Red Team",
          B: "Blue Team",
          C: "Green Team",
          D: "Purple Team"
        },
        defaultTitle: "Quiz Board",
        lobby: {
          open: "Open seat",
          needTwoTeams: "Waiting for at least 2 teams…",
          timeLimit: "{{n}} seconds per question.",
          questionSingular: "{{n}} square",
          questionPlural: "{{n}} squares",
          ready: "Ready",
          startGame: "Start Game ({{n}} teams)",
          matchStarting: "Game starting…",
          leaveRoom: "Leave Room",
          penaltyOn: "In this game, wrong answers lose the square's points.",
          penaltyOff: "In this game, wrong answers cost nothing."
        },
        match: {
          teamPicks: "{{team}} picks",
          teamWins: "{{team}} wins {{points}} points!",
          typeYourAnswer: "Type your answer",
          submit: "Submit",
          getReady: "Get ready…",
          yourPick: "Your team picks a square.",
          waitPick: "Waiting for the team in control to pick…",
          hostPickHint: "Click a square to pick it for the team in control.",
          notAnswered: "No answer yet",
          answered: "Answer sent",
          judging: "Waiting for the teacher…",
          waitingHost: "Answer sent. Waiting for the teacher to judge…",
          correct: "✓ Correct",
          wrong: "✗ Wrong",
          notJudged: "Not needed",
          nobody: "Nobody got it.",
          answerWas: "Answer: {{answer}}"
        },
        judge: {
          heading: "Judge the answer",
          expected: "Expected answer: {{answer}}",
          teamSaid: "{{team}} answered:",
          markCorrect: "✓ Correct",
          markWrong: "✗ Wrong"
        },
        display: {
          correct: "Correct",
          wrong: "Wrong"
        },
        end: {
          teamWins: "{{team}} wins the board!",
          draw: "It's a draw!",
          rematch: "Rematch",
          newGame: "New Game",
          points: "Points"
        },
        notice: {
          connectError: "Can't reach the game server right now. Check your connection and reload."
        },
        err: {
          enterCode: "Enter the 4-letter code."
        }
      },
      teamBuzzer: {
        title: "Spotlight Showdown",
        eyebrow: "a classroom buzzer quiz",
        heroTitle: "Spotlight Showdown",
        lede: "Two teams, one question at a time. Buzz in first with the right answer to score the point.",
        role: {
          join: { title: "Join a Showdown", desc: "Got a room code from your teacher? Enter it here and pick your team.", button: "Join a Showdown" },
          bigScreen: { title: "Big Screen", desc: "Put the stage and scoreboard up on a projector for everyone to see.", button: "Big Screen" }
        },
        howto: "<b>How scoring works:</b> both teams see the same question at the same time. The first correct answer wins the point. Wrong guesses don't cost you, so keep trying until someone gets it or time runs out. First team to <span class=\"mono\" id=\"howtoWinScore\">5</span> points wins the showdown.",
        join: { label: "Enter the 4-letter room code", findRoom: "Find Room", roomLabel: "Room", joinRed: "▲ Join Red", joinBlue: "◆ Join Blue", watchBigScreen: "Watch on the Big Screen" },
        defaultTitle: "Spotlight Showdown",
        lobby: { questionSingular: "{{n}} question", questionPlural: "{{n}} questions", redTeam: "Red Team", blueTeam: "Blue Team", ready: "Ready", waiting: "Waiting…", startShowdown: "Start Showdown", matchStarting: "Match starting…", waitingBothTeams: "Waiting for both teams…", leaveRoom: "Leave Room" },
        match: {
          teamTagRed: "▲ RED TEAM", teamTagBlue: "◆ BLUE TEAM", typeYourAnswer: "Type your answer", buzz: "🔔 Buzz!", getReady: "Get ready…",
          redBuzzedFirst: "▲ Red Team buzzed in first!", blueBuzzedFirst: "◆ Blue Team buzzed in first!", timesUp: "⏱ Time's up. No one got it.",
          watchingCaption: "Watching on the big screen. Teams are buzzing in from their own devices.", scoreRedTag: "▲ RED", scoreBlueTag: "BLUE ◆"
        },
        display: { correct: "Correct", wrong: "Wrong" },
        end: { redWins: "Red Team wins the showdown!", blueWins: "Blue Team wins the showdown!", draw: "It's a draw!", rematch: "Rematch", newShowdown: "New Showdown", points: "Points" },
        notice: { connectError: "Can't reach the game server right now. Check your connection and reload." },
        err: { enterCode: "Enter the 4-letter code." }
      }
    }
  },

  fr: {
    common: {
      langLabel: "Langue",
      backLabel: "Retour",
      copy: "Copier le code",
      copied: "Copié !",
      back: "← Retour"
    },
    errors: {
      roomNotFound: "Aucune partie trouvée avec ce code.",
      invalidTeam: "Équipe invalide.",
      teamTaken: "Cette équipe est déjà prise.",
      noQuestions: "Ajoutez au moins une question valide.",
      badPasscode: "Code enseignant incorrect.",
      passcodeNotConfigured: "Les quiz enregistrés sont verrouillés tant que le code enseignant du site n'est pas défini.",
      notFound: "Cet élément n'existe plus.",
      gameStarted: "Cette partie a déjà commencé."
    },
    hub: {
      title: "Jeux éducatifs",
      nav: {
        home: "Accueil",
        play: "Jouer",
        create: "Créer",
        notes: "Notes de cours"
      },
      hero: {
        eyebrow: "Grande curiosité. Découverte partagée.",
        title1: "Apprendre sérieusement.",
        title2: "Jouer ensemble.",
        lede: "Des jeux d'équipe en direct pour la classe et des notes de cours claires, de la 4e à la 12e année."
      },
      join: {
        eyebrow: "Pour les élèves",
        title: "Votre classe vous attend.",
        desc: "Saisissez le code de 4 lettres affiché sur l'écran de la classe.",
        label: "Code de la salle",
        placeholder: "Code de la salle",
        button: "Rejoindre une partie",
        hint: "Aucun compte requis. Choisissez simplement votre équipe."
      },
      sectionTitle: "Une belle leçon commence ici.",
      sectionNote: "Rien à télécharger. Aucun compte.",
      card: {
        play: {
          eyebrow: "Pour les élèves · Jouer",
          title: "Jouer à un jeu",
          desc: "Rejoignez une partie en cours, ou choisissez un quiz enregistré par vos enseignants et lancez une nouvelle partie.",
          link: "Ouvrir Jouer"
        },
        create: {
          eyebrow: "Pour les enseignants · Créer",
          title: "Créer un jeu",
          desc: "Rédigez vos propres questions pour n'importe quelle matière, ou lancez une partie rapide de Chiffre à la corde.",
          link: "Ouvrir l'éditeur"
        },
        courseNotes: {
          eyebrow: "Pour tous · Apprendre",
          title: "Notes de cours",
          desc: "Des notes de mathématiques, physique et chimie avec des équations correctement composées. Lisez-les directement, ou empruntez un exercice pour un jeu.",
          link: "Explorer les notes de cours"
        }
      },
      spotlight: {
        eyebrow: "À la une · Mathématiques",
        title: "Résoudre les équations du second degré.",
        desc: "La complétion du carré et la formule quadratique.",
        link: "Lire la leçon"
      },
      footer: {
        left: "Jeux éducatifs · Conçu pour la curiosité en classe.",
        right: "Apprendre ensemble. Jouer avec bienveillance."
      }
    },
    play: {
      title: "Jeux d'équipe",
      eyebrow: "Élèves et enseignants",
      heroTitle: "Jouons ensemble.",
      lede: "Rejoignez une partie ouverte, ou lancez une nouvelle partie à partir d'un quiz enregistré par vos enseignants.",
      role: {
        join: { title: "Rejoindre un jeu", desc: "Vous avez un code de votre enseignant ? Entrez-le ici et choisissez votre équipe.", button: "Rejoindre un jeu" },
        bigScreen: { title: "Grand écran", desc: "Affichez le jeu sur un projecteur pour que toute la classe puisse regarder.", button: "Grand écran" }
      },
      lookup: {
        back: "← Retour",
        label: "Entrez le code de la salle à 4 lettres",
        labelBigScreen: "Entrez le code pour l'afficher sur le grand écran",
        placeholder: "----",
        button: "Trouver la salle",
        errShort: "Entrez le code à 4 lettres.",
        errNotFound: "Aucune correspondance trouvée pour ce code."
      },
      lobby: {
        heading: "Parties ouvertes en ce moment",
        empty: "Aucune partie n'est ouverte pour le moment.",
        join: "Rejoindre",
        bigScreen: "Grand écran",
        waiting: "En attente",
        playing: "En cours"
      },
      tabs: { active: "Parties en cours", all: "Tous les jeux" },
      library: {
        heading: "Jeux enregistrés par les enseignants",
        empty: "Aucun jeu enregistré pour le moment.",
        unavailable: "Les jeux enregistrés ne sont pas disponibles pour le moment.",
        play: "Jouer",
        launchFailed: "Impossible de lancer ce jeu. Réessayez.",
        questionSingular: "{{n}} question",
        questionPlural: "{{n}} questions"
      },
      notice: {
        connectError: "Impossible de joindre le serveur de jeu pour le moment. Vérifiez votre connexion et rechargez la page."
      }
    },
    teacher: {
      lede: "Rédigez vos propres questions pour n'importe quelle matière, avec la notation mathématique et scientifique, et obtenez un code que vos élèves utilisent depuis n'importe quel appareil.",
      eyebrow: "Espace enseignant",
      setup: { heading: "Réglages du jeu" },
      field: { title: "Titre du jeu", titlePlaceholder: "ex. Chapitre 6 Vocabulaire", gameType: "Type de jeu", theme: "Thème" },
      mechanic: { race: "Course", buzzer: "Buzzer", board: "Tableau" },
      addQuestion: "+ Ajouter une question",
      createRoom: "Créer la salle",
      done: {
        shareLabel: "Partagez ce code avec vos élèves",
        lede: "Les élèves vont sur {{link}}, entrent le code ci-dessus, puis choisissent une équipe.",
        openStudentView: "Ouvrir la page de connexion élève",
        createAnother: "Créer un autre jeu",
        buzzerHint: "Ceci est un jeu de buzzer. Ouvrez le lien du grand écran et projetez-le pour toute la classe ; les équipes buzzent depuis leurs propres appareils.",
        boardHint: "Ceci est un jeu de tableau. Ouvrez le lien du grand écran et projetez-le : l'animateur y choisit les cases et juge les réponses libres, tandis que les équipes répondent depuis leurs propres appareils."
      },
      q: {
        remove: "Supprimer la question",
        promptPlaceholder: "Texte de la question -- utilisez un bouton de la barre d'outils pour insérer une formule, ou tapez $...$ vous-même",
        previewPlaceholder: "L'aperçu apparaîtra ici",
        shortAnswer: "Réponse courte",
        multipleChoice: "Choix multiple",
        correctAnswer: "Réponse correcte",
        correctAnswerPlaceholder: "ex. Paris, ou 42",
        choicesLabel: "Choix (indiquez le bon)",
        addChoice: "+ Ajouter un choix",
        numbered: "Question {{n}}",
        choiceTextPlaceholder: "Texte du choix",
        category: "Catégorie",
        categoryPlaceholder: "ex. Fractions",
        points: "Points",
        openAnswer: "Réponse libre (jugée par l'enseignant)",
        expectedAnswer: "Réponse attendue"
      },
      themes: { rope: "Tir à la corde", rocket: "Course de fusées", spotlight: "Duel sous les projecteurs", classic: "Tableau de quiz" },
      templates: { fraction: "Fraction", exponent: "Exposant", squareRoot: "Racine carrée", chemistry: "Chimie" },
      err: {
        questionNeedsText: "La question {{n}} a besoin d'un texte.",
        questionNeedsChoices: "La question {{n}} a besoin d'au moins 2 choix.",
        questionNeedsCorrectChoice: "Question {{n}} : indiquez quel choix est correct.",
        questionNeedsAnswer: "La question {{n}} a besoin d'une réponse correcte.",
        questionNeedsCategory: "La question {{n}} a besoin d'une catégorie.",
        needOneQuestion: "Ajoutez au moins une question complète.",
        createFailed: "Impossible de créer la salle."
      },
      board: { penalty: "Les mauvaises réponses font perdre des points", timeLimit: "Temps par question", seconds: "{{n}} s", teams: "Nombre d'équipes", teamCount: "{{n}} équipes" },
      choose: {
        heading: "Que voulez-vous créer ?",
        custom: { title: "Rédiger vos propres questions", desc: "Toutes matières, format course ou buzzer, avec notation mathématique et scientifique." },
        numberHaul: { title: "Chiffre à la corde", desc: "Un tir à la corde mathématique rapide. Les questions sont générées automatiquement, sans préparation." }
      },
      passcode: { label: "Code enseignant", placeholder: "Entrez le code enseignant", hint: "Nécessaire pour charger, enregistrer, modifier ou supprimer des quiz enregistrés.", button: "Déverrouiller", ok: "Déverrouillé" },
      library: {
        saveButton: "Enregistrer pour plus tard",
        saved: "Enregistré !",
        updateButton: "Mettre à jour le quiz",
        updated: "Mis à jour !",
        loadButton: "Charger un quiz enregistré",
        heading: "Quiz enregistrés",
        empty: "Aucun quiz enregistré pour le moment.",
        close: "Fermer",
        load: "Charger",
        delete: "Supprimer",
        questionSingular: "{{n}} question",
        questionPlural: "{{n}} questions",
        unavailable: "Les quiz enregistrés ne sont pas disponibles pour le moment."
      }
    },
    lessons: {
      brand: "Jeux éducatifs",
      nav: "Notes de cours",
      pickSubject: "Choisissez une matière",
      empty: "Aucune leçon n'a encore été publiée.",
      emptySubject: "Aucune leçon ici pour l'instant.",
      notFoundTitle: "Introuvable",
      notFoundBody: "Il n'y a pas encore de leçon à cette adresse.",
      subjects: { math: "Mathématiques", physics: "Physique", chemistry: "Chimie" },
      lede: "Des explications claires et des exemples résolus, avec des équations correctement composées.",
      openSubject: "Ouvrir les notes",
      read: "Lire",
      inThisNote: "Dans cette note",
      allNotes: "Toutes les notes de cours",
      readTime: "{{n}} min de lecture",
      play: {
        eyebrow: "Apprendre → Jouer",
        title: "Mettez l'idée en jeu.",
        desc: "Transformez cette note en jeu d'équipe pour votre classe.",
        button: "Ouvrir l'éditeur"
      }
    },
    games: {
      tugOfWar: {
        title: "Chiffre à la corde",
        eyebrow: "un tir à la corde mathématique",
        heroTitle: "Chiffre à la corde",
        lede: "Deux équipes, deux appareils, une corde. Résolvez les calculs vite et bien pour tirer le drapeau au-delà de la ligne avant l'autre équipe.",
        role: {
          create: { title: "Démarrer une partie", desc: "Choisissez une difficulté, obtenez un code de salle et invitez l'autre équipe.", button: "Démarrer une partie" },
          join: { title: "Rejoindre une partie", desc: "Vous avez un code de votre enseignant ou de l'autre équipe ? Entrez ici.", button: "Rejoindre une partie" },
          bigScreen: { title: "Grand écran", desc: "Affichez la corde et les scores en direct sur un projecteur pour que tout le monde puisse voir.", button: "Grand écran" }
        },
        howto: "<b>Comment fonctionne le score :</b> une bonne réponse tire la corde vers votre côté : 10 points en moins de 5 secondes, 7 points entre 5 et 10 secondes, 5 points après. Une mauvaise réponse ne rapporte rien et coûte un instant avant la question suivante : la vitesse ne paie que si vous avez aussi raison. La première équipe à faire passer le drapeau au-delà de sa ligne gagne la manche.",
        create: { chooseDifficulty: "1. Choisissez la difficulté", pickTeam: "2. Choisissez votre équipe", redTeam: "▲ Équipe Rouge", blueTeam: "◆ Équipe Bleue", createRoom: "Créer la salle" },
        join: { label: "Entrez le code de la salle à 4 lettres", findRoom: "Trouver la salle", roomLabel: "Salle", joinRed: "▲ Rejoindre Rouge", joinBlue: "◆ Rejoindre Bleue", watchBigScreen: "Regarder sur le grand écran" },
        lobby: { difficulty: "Difficulté : {{tier}}", redTeam: "Équipe Rouge", blueTeam: "Équipe Bleue", ready: "Prête", waiting: "En attente…", startMatch: "Démarrer la partie", matchStarting: "La partie démarre…", waitingBothTeams: "En attente des deux équipes…", leaveRoom: "Quitter la salle" },
        match: { redTag: "▲ ROUGE", blueTag: "BLEUE ◆", teamTagRed: "▲ ÉQUIPE ROUGE", teamTagBlue: "◆ ÉQUIPE BLEUE", streak: "Série {{n}}", accuracy: "Précision {{value}}", haul: "Tirer ✓" },
        display: { correct: "Correct", wrong: "Erreurs", accuracy: "Précision" },
        end: { redWins: "L'équipe Rouge gagne la manche !", blueWins: "L'équipe Bleue gagne la manche !", draw: "Match nul !", rematch: "Revanche", newMatch: "Nouvelle partie" },
        notice: { connectError: "Impossible de joindre le serveur de jeu pour le moment. Vérifiez votre connexion et rechargez la page." },
        err: { createFailed: "Impossible de créer la salle.", enterCode: "Entrez le code à 4 lettres." },
        tiers: {
          rookie: { label: "Débutant", blurb: "Addition et soustraction, nombres jusqu'à 20" },
          varsity: { label: "Intermédiaire", blurb: "+ − × ÷ et fractions, nombres plus grands" },
          champion: { label: "Champion", blurb: "Nombres négatifs, priorités opératoires, exposants" }
        }
      },
      teamRace: {
        title: "Course d'équipe",
        eyebrow: "une course d'équipe de classe",
        heroTitle: "Course d'équipe",
        lede: "Deux ou quatre équipes, une course. Répondez aux questions de votre enseignant vite et bien pour prendre l'avantage sur les autres équipes.",
        role: {
          join: { title: "Rejoindre une course", desc: "Vous avez un code de votre enseignant ? Entrez-le ici et choisissez votre équipe.", button: "Rejoindre une course" },
          bigScreen: { title: "Grand écran", desc: "Affichez la course et les scores en direct sur un projecteur pour que tout le monde puisse voir.", button: "Grand écran" }
        },
        howto: "<b>Comment fonctionne le score :</b> une bonne réponse tire le repère vers votre côté, davantage pour une réponse rapide, moins pour une réponse lente. Une mauvaise réponse ne rapporte rien et coûte un instant avant la question suivante. La première équipe à amener le repère de son côté gagne la course.",
        join: { label: "Entrez le code de la salle à 4 lettres", findRoom: "Trouver la salle", roomLabel: "Salle", joinTeam: "Rejoindre : {{team}}", watchBigScreen: "Regarder sur le grand écran" },
        teams: { A: "Équipe Rouge", B: "Équipe Bleue", C: "Équipe Verte", D: "Équipe Violette" },
        defaultTitle: "Course d'équipe",
        lobby: { questionSingular: "{{n}} question", questionPlural: "{{n}} questions", ready: "Prête", waiting: "En attente…", startRace: "Démarrer la course", startRaceTeams: "Démarrer la course ({{n}} équipes)", needTwoTeams: "En attente d'au moins 2 équipes…", matchStarting: "La partie démarre…", waitingBothTeams: "En attente des deux équipes…", leaveRoom: "Quitter la salle" },
        match: { timeLeft: "Temps restant", redTag: "▲ ROUGE", blueTag: "BLEUE ◆", streak: "Série {{n}}", accuracy: "Précision {{value}}", typeYourAnswer: "Tapez votre réponse", submit: "Valider" },
        display: { correct: "Correct", wrong: "Erreurs", accuracy: "Précision" },
        end: { champions: "Les champions du jour", leaderboard: "Classement final", noWinner: "Pas de gagnant cette fois.", teamWins: "{{team}} gagne la course !", draw: "Match nul !", rematch: "Revanche", newRace: "Nouvelle course" },
        notice: { connectError: "Impossible de joindre le serveur de jeu pour le moment. Vérifiez votre connexion et rechargez la page." },
        err: { enterCode: "Entrez le code à 4 lettres." }
      },
      teamBoard: {
        title: "Tableau de quiz",
        eyebrow: "un tableau de quiz pour la classe",
        heroTitle: "Tableau de quiz",
        lede: "De deux à quatre équipes, un tableau. Choisissez une case, répondez sur votre appareil et gagnez ses points.",
        role: {
          join: {
            title: "Rejoindre un tableau",
            desc: "Vous avez un code de votre enseignant ? Entrez-le ici et choisissez votre équipe.",
            button: "Rejoindre un tableau"
          },
          bigScreen: {
            title: "Grand écran",
            desc: "Affichez le tableau sur un projecteur. L'animateur y choisit les cases et juge les réponses libres.",
            button: "Grand écran"
          }
        },
        howto: "<b>Comment ça marche :</b> jusqu'à 4 équipes peuvent rejoindre. L'équipe qui a la main choisit une case, et chaque équipe a droit à une réponse. La première bonne réponse gagne les points de la case et la main sur le tableau. Quand toutes les cases sont jouées, le meilleur score gagne.",
        join: {
          joinTeam: "Rejoindre : {{team}}",
          label: "Entrez le code de la salle à 4 lettres",
          findRoom: "Trouver la salle",
          roomLabel: "Salle",
          watchBigScreen: "Regarder sur le grand écran"
        },
        teams: {
          A: "Équipe Rouge",
          B: "Équipe Bleue",
          C: "Équipe Verte",
          D: "Équipe Violette"
        },
        defaultTitle: "Tableau de quiz",
        lobby: {
          open: "Place libre",
          needTwoTeams: "En attente d'au moins 2 équipes…",
          timeLimit: "{{n}} secondes par question.",
          questionSingular: "{{n}} case",
          questionPlural: "{{n}} cases",
          ready: "Prête",
          startGame: "Démarrer la partie ({{n}} équipes)",
          matchStarting: "La partie démarre…",
          leaveRoom: "Quitter la salle",
          penaltyOn: "Dans cette partie, une mauvaise réponse fait perdre les points de la case.",
          penaltyOff: "Dans cette partie, une mauvaise réponse ne coûte rien."
        },
        match: {
          teamPicks: "{{team}} choisit",
          teamWins: "{{team}} gagne {{points}} points !",
          typeYourAnswer: "Tapez votre réponse",
          submit: "Envoyer",
          getReady: "Préparez-vous…",
          yourPick: "Votre équipe choisit une case.",
          waitPick: "En attente du choix de l'équipe qui a la main…",
          hostPickHint: "Cliquez sur une case pour la choisir à la place de l'équipe qui a la main.",
          notAnswered: "Pas encore de réponse",
          answered: "Réponse envoyée",
          judging: "En attente de l'enseignant…",
          waitingHost: "Réponse envoyée. En attente du jugement de l'enseignant…",
          correct: "✓ Correct",
          wrong: "✗ Faux",
          notJudged: "Non nécessaire",
          nobody: "Personne n'a trouvé.",
          answerWas: "Réponse : {{answer}}"
        },
        judge: {
          heading: "Juger la réponse",
          expected: "Réponse attendue : {{answer}}",
          teamSaid: "{{team}} a répondu :",
          markCorrect: "✓ Correct",
          markWrong: "✗ Faux"
        },
        display: {
          correct: "Correctes",
          wrong: "Fausses"
        },
        end: {
          teamWins: "{{team}} remporte le tableau !",
          draw: "Égalité !",
          rematch: "Revanche",
          newGame: "Nouvelle partie",
          points: "Points"
        },
        notice: {
          connectError: "Impossible de joindre le serveur de jeu pour le moment. Vérifiez votre connexion et rechargez la page."
        },
        err: {
          enterCode: "Entrez le code à 4 lettres."
        }
      },
      teamBuzzer: {
        title: "Duel sous les projecteurs",
        eyebrow: "un quiz à buzzer pour la classe",
        heroTitle: "Duel sous les projecteurs",
        lede: "Deux équipes, une question à la fois. Buzzez les premiers avec la bonne réponse pour marquer le point.",
        role: {
          join: { title: "Rejoindre un duel", desc: "Vous avez un code de votre enseignant ? Entrez-le ici et choisissez votre équipe.", button: "Rejoindre un duel" },
          bigScreen: { title: "Grand écran", desc: "Affichez la scène et le tableau des scores sur un projecteur pour que tout le monde puisse voir.", button: "Grand écran" }
        },
        howto: "<b>Comment fonctionne le score :</b> les deux équipes voient la même question au même moment. La première bonne réponse remporte le point. Une mauvaise réponse ne coûte rien, alors continuez d'essayer jusqu'à ce que quelqu'un trouve ou que le temps soit écoulé. La première équipe à <span class=\"mono\" id=\"howtoWinScore\">5</span> points gagne le duel.",
        join: { label: "Entrez le code de la salle à 4 lettres", findRoom: "Trouver la salle", roomLabel: "Salle", joinRed: "▲ Rejoindre Rouge", joinBlue: "◆ Rejoindre Bleue", watchBigScreen: "Regarder sur le grand écran" },
        defaultTitle: "Duel sous les projecteurs",
        lobby: { questionSingular: "{{n}} question", questionPlural: "{{n}} questions", redTeam: "Équipe Rouge", blueTeam: "Équipe Bleue", ready: "Prête", waiting: "En attente…", startShowdown: "Démarrer le duel", matchStarting: "La partie démarre…", waitingBothTeams: "En attente des deux équipes…", leaveRoom: "Quitter la salle" },
        match: {
          teamTagRed: "▲ ÉQUIPE ROUGE", teamTagBlue: "◆ ÉQUIPE BLEUE", typeYourAnswer: "Tapez votre réponse", buzz: "🔔 Buzz !", getReady: "Préparez-vous…",
          redBuzzedFirst: "▲ L'équipe Rouge a buzzé en premier !", blueBuzzedFirst: "◆ L'équipe Bleue a buzzé en premier !", timesUp: "⏱ Temps écoulé. Personne n'a trouvé.",
          watchingCaption: "Vous regardez sur le grand écran. Les équipes buzzent depuis leurs propres appareils.", scoreRedTag: "▲ ROUGE", scoreBlueTag: "BLEUE ◆"
        },
        display: { correct: "Correct", wrong: "Erreurs" },
        end: { redWins: "L'équipe Rouge gagne le duel !", blueWins: "L'équipe Bleue gagne le duel !", draw: "Match nul !", rematch: "Revanche", newShowdown: "Nouveau duel", points: "Points" },
        notice: { connectError: "Impossible de joindre le serveur de jeu pour le moment. Vérifiez votre connexion et rechargez la page." },
        err: { enterCode: "Entrez le code à 4 lettres." }
      }
    }
  },

  ar: {
    common: {
      langLabel: "اللغة",
      backLabel: "رجوع",
      copy: "نسخ الرمز",
      copied: "تم النسخ!",
      back: "→ رجوع"
    },
    errors: {
      roomNotFound: "لم يتم العثور على مباراة بهذا الرمز.",
      invalidTeam: "فريق غير صالح.",
      teamTaken: "هذا الفريق مأخوذ بالفعل.",
      noQuestions: "أضف سؤالاً واحداً صالحاً على الأقل.",
      badPasscode: "رمز المعلم غير صحيح.",
      passcodeNotConfigured: "الاختبارات المحفوظة مقفلة حتى يتم تعيين رمز المعلم للموقع.",
      notFound: "هذا العنصر لم يعد موجودًا.",
      gameStarted: "هذه اللعبة بدأت بالفعل."
    },
    hub: {
      title: "الألعاب التعليمية",
      nav: {
        home: "الرئيسية",
        play: "العب",
        create: "أنشئ",
        notes: "ملاحظات الدروس"
      },
      hero: {
        eyebrow: "فضول كبير. اكتشاف مشترك.",
        title1: "تعلّم بجدّ.",
        title2: "والعب بروح الفريق.",
        lede: "ألعاب فرق مباشرة داخل الصف وملاحظات دروس واضحة للصفوف من الرابع إلى الثاني عشر."
      },
      join: {
        eyebrow: "للطلاب",
        title: "صفّك ينتظرك.",
        desc: "أدخل الرمز المكوّن من 4 أحرف الظاهر على شاشة الصف.",
        label: "رمز الغرفة",
        placeholder: "رمز الغرفة",
        button: "انضمّ إلى لعبة",
        hint: "لا حاجة إلى حساب. اختر فريقك فقط."
      },
      sectionTitle: "درس رائع يبدأ من هنا.",
      sectionNote: "بلا تنزيلات. وبلا حسابات.",
      card: {
        play: {
          eyebrow: "للطلاب · العب",
          title: "العب لعبة",
          desc: "انضم إلى لعبة جارية الآن، أو اختر اختبارًا محفوظًا من معلميك وابدأ مباراة جديدة.",
          link: "افتح صفحة اللعب"
        },
        create: {
          eyebrow: "للمعلّمين · إنشاء",
          title: "إنشاء لعبة",
          desc: "اكتب أسئلتك الخاصة لأي مادة، أو ابدأ مباراة سريعة في شد الحبل بالأرقام.",
          link: "افتح المحرّر"
        },
        courseNotes: {
          eyebrow: "للجميع · تعلّم",
          title: "ملاحظات الدروس",
          desc: "ملاحظات في الرياضيات والفيزياء والكيمياء مع معادلات منسقة بشكل صحيح. اقرأها مباشرة، أو استعر مسألة لإحدى الألعاب.",
          link: "تصفّح ملاحظات الدروس"
        }
      },
      spotlight: {
        eyebrow: "في دائرة الضوء · الرياضيات",
        title: "حلّ المعادلات التربيعية.",
        desc: "إكمال المربع والقانون العام.",
        link: "اقرأ الدرس"
      },
      footer: {
        left: "الألعاب التعليمية · صُمّمت لفضول الصف.",
        right: "تعلّم معًا. والعب باحترام."
      }
    },
    play: {
      title: "ألعاب الفرق",
      eyebrow: "للطلاب والمعلّمين",
      heroTitle: "لنلعب معًا.",
      lede: "انضم إلى لعبة مفتوحة الآن، أو ابدأ مباراة جديدة من اختبار حفظه معلموك.",
      role: {
        join: { title: "الانضمام إلى لعبة", desc: "هل لديك رمز غرفة من معلمك؟ أدخله هنا واختر فريقك.", button: "الانضمام إلى لعبة" },
        bigScreen: { title: "الشاشة الكبيرة", desc: "اعرض اللعبة على جهاز عرض ليشاهدها الصف بأكمله.", button: "الشاشة الكبيرة" }
      },
      lookup: {
        back: "→ رجوع",
        label: "أدخل رمز الغرفة المكوّن من 4 أحرف",
        labelBigScreen: "أدخل الرمز لعرضه على الشاشة الكبيرة",
        placeholder: "----",
        button: "البحث عن الغرفة",
        errShort: "أدخل الرمز المكوّن من 4 أحرف.",
        errNotFound: "لم يتم العثور على تطابق لهذا الرمز."
      },
      lobby: {
        heading: "الألعاب المفتوحة الآن",
        empty: "لا توجد ألعاب مفتوحة حاليًا.",
        join: "انضمام",
        bigScreen: "الشاشة الكبيرة",
        waiting: "في الانتظار",
        playing: "جارية"
      },
      tabs: { active: "الألعاب النشطة", all: "كل الألعاب" },
      library: {
        heading: "ألعاب محفوظة من المعلمين",
        empty: "لا توجد ألعاب محفوظة بعد.",
        unavailable: "الألعاب المحفوظة غير متاحة الآن.",
        play: "العب",
        launchFailed: "تعذّر بدء هذه اللعبة. حاول مرة أخرى.",
        questionSingular: "{{n}} سؤال",
        questionPlural: "{{n}} أسئلة"
      },
      notice: {
        connectError: "تعذّر الوصول إلى خادم اللعبة الآن. تحقق من اتصالك وأعد تحميل الصفحة."
      }
    },
    teacher: {
      lede: "اكتب أسئلتك الخاصة لأي مادة، مع دعم الرموز الرياضية والعلمية، واحصل على رمز ينضم به طلابك من أي جهاز.",
      eyebrow: "مساحة المعلّم",
      setup: { heading: "إعدادات اللعبة" },
      field: { title: "عنوان اللعبة", titlePlaceholder: "مثال: مفردات الفصل 6", gameType: "نوع اللعبة", theme: "السمة" },
      mechanic: { race: "سباق", buzzer: "جرس", board: "لوحة" },
      addQuestion: "+ إضافة سؤال",
      createRoom: "إنشاء الغرفة",
      done: {
        shareLabel: "شارك هذا الرمز مع طلابك",
        lede: "يذهب الطلاب إلى {{link}}، ويدخلون الرمز أعلاه، ثم يختارون فريقًا.",
        openStudentView: "فتح صفحة انضمام الطالب",
        createAnother: "إنشاء لعبة أخرى",
        buzzerHint: "هذه لعبة جرس. افتح رابط الشاشة الكبيرة واعرضه لكامل الصف؛ تضغط الفرق الجرس من أجهزتها الخاصة.",
        boardHint: "هذه لعبة لوحة. افتح رابط الشاشة الكبيرة واعرضه: يختار المقدّم المربعات ويحكم على الإجابات المفتوحة من هناك، بينما تجيب الفرق من أجهزتها الخاصة."
      },
      q: {
        remove: "حذف السؤال",
        promptPlaceholder: "نص السؤال -- استخدم زر شريط الأدوات لإدراج رمز رياضي، أو اكتب $...$ بنفسك",
        previewPlaceholder: "ستظهر المعاينة هنا",
        shortAnswer: "إجابة قصيرة",
        multipleChoice: "اختيار من متعدد",
        correctAnswer: "الإجابة الصحيحة",
        correctAnswerPlaceholder: "مثال: باريس، أو 42",
        choicesLabel: "الخيارات (حدّد الصحيح)",
        addChoice: "+ إضافة خيار",
        numbered: "السؤال {{n}}",
        choiceTextPlaceholder: "نص الخيار",
        category: "الفئة",
        categoryPlaceholder: "مثال: الكسور",
        points: "النقاط",
        openAnswer: "إجابة مفتوحة (يحكم عليها المعلم)",
        expectedAnswer: "الإجابة المتوقعة"
      },
      themes: { rope: "شد الحبل", rocket: "سباق الصواريخ", spotlight: "مواجهة الأضواء", classic: "لوحة الأسئلة" },
      templates: { fraction: "كسر", exponent: "أس", squareRoot: "جذر تربيعي", chemistry: "كيمياء" },
      err: {
        questionNeedsText: "السؤال {{n}} يحتاج إلى نص.",
        questionNeedsChoices: "السؤال {{n}} يحتاج إلى خيارين على الأقل.",
        questionNeedsCorrectChoice: "السؤال {{n}}: حدّد الخيار الصحيح.",
        questionNeedsAnswer: "السؤال {{n}} يحتاج إلى إجابة صحيحة.",
        questionNeedsCategory: "السؤال {{n}} يحتاج إلى فئة.",
        needOneQuestion: "أضف سؤالاً واحداً كاملاً على الأقل.",
        createFailed: "تعذّر إنشاء الغرفة."
      },
      board: { penalty: "الإجابات الخاطئة تخسر النقاط", timeLimit: "الوقت لكل سؤال", seconds: "{{n}} ث", teams: "عدد الفرق", teamCount: "{{n}} فرق" },
      choose: {
        heading: "ماذا تريد أن تنشئ؟",
        custom: { title: "اكتب أسئلتك الخاصة", desc: "لأي مادة، بنمط السباق أو الجرس، مع دعم الرموز الرياضية والعلمية." },
        numberHaul: { title: "شد الحبل بالأرقام", desc: "لعبة شد حبل رياضية سريعة. تُنشأ الأسئلة تلقائيًا دون أي إعداد." }
      },
      passcode: { label: "رمز المعلم", placeholder: "أدخل رمز المعلم", hint: "مطلوب لتحميل الاختبارات المحفوظة أو حفظها أو تعديلها أو حذفها.", button: "فتح", ok: "تم الفتح" },
      library: {
        saveButton: "حفظ لوقت لاحق",
        saved: "تم الحفظ!",
        updateButton: "تحديث الاختبار",
        updated: "تم التحديث!",
        loadButton: "تحميل اختبار محفوظ",
        heading: "الاختبارات المحفوظة",
        empty: "لا توجد اختبارات محفوظة بعد.",
        close: "إغلاق",
        load: "تحميل",
        delete: "حذف",
        questionSingular: "{{n}} سؤال",
        questionPlural: "{{n}} أسئلة",
        unavailable: "الاختبارات المحفوظة غير متاحة الآن."
      }
    },
    lessons: {
      brand: "الألعاب التعليمية",
      nav: "ملاحظات الدروس",
      pickSubject: "اختر مادة",
      empty: "لم يتم نشر أي دروس بعد.",
      emptySubject: "لا توجد دروس هنا بعد.",
      notFoundTitle: "غير موجود",
      notFoundBody: "لا يوجد درس على هذا العنوان بعد.",
      subjects: { math: "الرياضيات", physics: "الفيزياء", chemistry: "الكيمياء" },
      lede: "شروحات واضحة وأمثلة محلولة، مع معادلات منسقة بشكل صحيح.",
      openSubject: "افتح الملاحظات",
      read: "اقرأ",
      inThisNote: "في هذه الملاحظة",
      allNotes: "كل ملاحظات الدروس",
      readTime: "مدة القراءة {{n}} دقيقة",
      play: {
        eyebrow: "تعلّم ← العب",
        title: "حوّل الفكرة إلى لعبة.",
        desc: "حوّل هذه الملاحظة إلى لعبة فرق لصفك.",
        button: "افتح المحرّر"
      }
    },
    games: {
      tugOfWar: {
        title: "شد الحبل بالأرقام",
        eyebrow: "لعبة شد حبل رياضية",
        heroTitle: "شد الحبل بالأرقام",
        lede: "فريقان، جهازان، حبل واحد. حل المسائل الحسابية بسرعة ودقة لسحب العلم عبر الخط قبل الفريق الآخر.",
        role: {
          create: { title: "بدء مباراة", desc: "اختر مستوى الصعوبة، واحصل على رمز الغرفة، ودعُ الفريق الآخر.", button: "بدء مباراة" },
          join: { title: "الانضمام إلى مباراة", desc: "هل لديك رمز من معلمك أو من الفريق الآخر؟ انضم من هنا.", button: "الانضمام إلى مباراة" },
          bigScreen: { title: "الشاشة الكبيرة", desc: "اعرض الحبل والنتائج المباشرة على جهاز عرض ليراها الجميع.", button: "الشاشة الكبيرة" }
        },
        howto: "<b>كيف تُحسب النقاط:</b> الإجابة الصحيحة تسحب الحبل نحو جهتك: 10 نقاط في أقل من 5 ثوانٍ، و7 نقاط بين 5 و10 ثوانٍ، و5 نقاط بعد ذلك. الإجابة الخاطئة لا تمنح نقاطاً وتكلّفك لحظة قبل السؤال التالي، فالسرعة تُجدي فقط عندما تكون إجابتك صحيحة أيضاً. يفوز بالشوط الفريق الذي يسحب العلم أولاً عبر خطه.",
        create: { chooseDifficulty: "1. اختر مستوى الصعوبة", pickTeam: "2. اختر فريقك", redTeam: "▲ الفريق الأحمر", blueTeam: "◆ الفريق الأزرق", createRoom: "إنشاء الغرفة" },
        join: { label: "أدخل رمز الغرفة المكوّن من 4 أحرف", findRoom: "البحث عن الغرفة", roomLabel: "الغرفة", joinRed: "▲ الانضمام للأحمر", joinBlue: "◆ الانضمام للأزرق", watchBigScreen: "المشاهدة على الشاشة الكبيرة" },
        lobby: { difficulty: "الصعوبة: {{tier}}", redTeam: "الفريق الأحمر", blueTeam: "الفريق الأزرق", ready: "جاهز", waiting: "في الانتظار…", startMatch: "بدء المباراة", matchStarting: "المباراة تبدأ…", waitingBothTeams: "في انتظار كلا الفريقين…", leaveRoom: "مغادرة الغرفة" },
        match: { redTag: "▲ أحمر", blueTag: "أزرق ◆", teamTagRed: "▲ الفريق الأحمر", teamTagBlue: "◆ الفريق الأزرق", streak: "متتالية {{n}}", accuracy: "الدقة {{value}}", haul: "سحب ✓" },
        display: { correct: "صحيح", wrong: "خطأ", accuracy: "الدقة" },
        end: { redWins: "الفريق الأحمر يفوز بالشوط!", blueWins: "الفريق الأزرق يفوز بالشوط!", draw: "تعادل!", rematch: "مباراة أخرى", newMatch: "مباراة جديدة" },
        notice: { connectError: "تعذّر الوصول إلى خادم اللعبة الآن. تحقق من اتصالك وأعد تحميل الصفحة." },
        err: { createFailed: "تعذّر إنشاء الغرفة.", enterCode: "أدخل الرمز المكوّن من 4 أحرف." },
        tiers: {
          rookie: { label: "مبتدئ", blurb: "الجمع والطرح، أرقام حتى 20" },
          varsity: { label: "متوسط", blurb: "+ − × ÷ والكسور، أرقام أكبر" },
          champion: { label: "بطل", blurb: "الأعداد السالبة، ترتيب العمليات، الأسس" }
        }
      },
      teamRace: {
        title: "سباق الفرق",
        eyebrow: "سباق فرق للصف",
        heroTitle: "سباق الفرق",
        lede: "فريقان أو أربعة فرق، سباق واحد. أجب عن أسئلة معلمك بسرعة ودقة للتقدم على الفرق الأخرى.",
        role: {
          join: { title: "الانضمام إلى سباق", desc: "هل لديك رمز من معلمك؟ أدخله هنا واختر فريقك.", button: "الانضمام إلى سباق" },
          bigScreen: { title: "الشاشة الكبيرة", desc: "اعرض السباق والنتائج المباشرة على جهاز عرض ليراها الجميع.", button: "الشاشة الكبيرة" }
        },
        howto: "<b>كيف تُحسب النقاط:</b> الإجابة الصحيحة تسحب المؤشر نحو جهتك، أكثر مقابل إجابة سريعة، وأقل مقابل إجابة بطيئة. الإجابة الخاطئة لا تمنح نقاطاً وتكلّفك لحظة قبل السؤال التالي. يفوز بالسباق الفريق الذي يصل بالمؤشر إلى جهته أولاً.",
        join: { label: "أدخل رمز الغرفة المكوّن من 4 أحرف", findRoom: "البحث عن الغرفة", roomLabel: "الغرفة", joinTeam: "انضم إلى {{team}}", watchBigScreen: "المشاهدة على الشاشة الكبيرة" },
        teams: { A: "الفريق الأحمر", B: "الفريق الأزرق", C: "الفريق الأخضر", D: "الفريق البنفسجي" },
        defaultTitle: "سباق الفرق",
        lobby: { questionSingular: "{{n}} سؤال", questionPlural: "{{n}} أسئلة", ready: "جاهز", waiting: "في الانتظار…", startRace: "بدء السباق", startRaceTeams: "بدء السباق ({{n}} فرق)", needTwoTeams: "في انتظار فريقين على الأقل…", matchStarting: "المباراة تبدأ…", waitingBothTeams: "في انتظار كلا الفريقين…", leaveRoom: "مغادرة الغرفة" },
        match: { timeLeft: "الوقت المتبقي", redTag: "▲ أحمر", blueTag: "أزرق ◆", streak: "متتالية {{n}}", accuracy: "الدقة {{value}}", typeYourAnswer: "اكتب إجابتك", submit: "إرسال" },
        display: { correct: "صحيح", wrong: "خطأ", accuracy: "الدقة" },
        end: { champions: "أبطال اليوم", leaderboard: "الترتيب النهائي", noWinner: "لا فائز هذه المرة.", teamWins: "{{team}} يفوز بالسباق!", draw: "تعادل!", rematch: "مباراة أخرى", newRace: "سباق جديد" },
        notice: { connectError: "تعذّر الوصول إلى خادم اللعبة الآن. تحقق من اتصالك وأعد تحميل الصفحة." },
        err: { enterCode: "أدخل الرمز المكوّن من 4 أحرف." }
      },
      teamBoard: {
        title: "لوحة الأسئلة",
        eyebrow: "لوحة أسئلة للصف",
        heroTitle: "لوحة الأسئلة",
        lede: "من فريقين إلى أربعة فرق ولوحة واحدة. اختر مربعًا، وأجب من جهازك، واربح نقاطه.",
        role: {
          join: {
            title: "الانضمام إلى لعبة اللوحة",
            desc: "هل لديك رمز غرفة من معلمك؟ أدخله هنا واختر فريقك.",
            button: "الانضمام إلى لعبة اللوحة"
          },
          bigScreen: {
            title: "الشاشة الكبيرة",
            desc: "اعرض اللوحة على جهاز عرض. يختار المقدّم المربعات ويحكم على الإجابات المفتوحة من هنا.",
            button: "الشاشة الكبيرة"
          }
        },
        howto: "<b>طريقة اللعب:</b> يمكن أن ينضم حتى 4 فرق. الفريق صاحب الدور يختار مربعًا، ولكل فريق إجابة واحدة. أول إجابة صحيحة تربح نقاط المربع والدور في اللوحة. عندما تنتهي كل المربعات، يفوز صاحب أعلى نتيجة.",
        join: {
          joinTeam: "انضم إلى {{team}}",
          label: "أدخل رمز الغرفة المكوّن من 4 أحرف",
          findRoom: "البحث عن الغرفة",
          roomLabel: "الغرفة",
          watchBigScreen: "المشاهدة على الشاشة الكبيرة"
        },
        teams: {
          A: "الفريق الأحمر",
          B: "الفريق الأزرق",
          C: "الفريق الأخضر",
          D: "الفريق البنفسجي"
        },
        defaultTitle: "لوحة الأسئلة",
        lobby: {
          open: "مقعد شاغر",
          needTwoTeams: "في انتظار فريقين على الأقل…",
          timeLimit: "{{n}} ثانية لكل سؤال.",
          questionSingular: "{{n}} مربع",
          questionPlural: "{{n}} مربعات",
          ready: "جاهز",
          startGame: "بدء اللعبة ({{n}} فرق)",
          matchStarting: "اللعبة تبدأ…",
          leaveRoom: "مغادرة الغرفة",
          penaltyOn: "في هذه اللعبة، الإجابة الخاطئة تخسر نقاط المربع.",
          penaltyOff: "في هذه اللعبة، الإجابة الخاطئة لا تكلف شيئًا."
        },
        match: {
          teamPicks: "دور {{team}}",
          teamWins: "{{team}} يربح {{points}} نقطة!",
          typeYourAnswer: "اكتب إجابتك",
          submit: "إرسال",
          getReady: "استعد…",
          yourPick: "فريقك يختار مربعًا.",
          waitPick: "في انتظار اختيار الفريق صاحب الدور…",
          hostPickHint: "انقر على مربع لاختياره نيابة عن الفريق صاحب الدور.",
          notAnswered: "لا إجابة بعد",
          answered: "تم إرسال الإجابة",
          judging: "في انتظار المعلم…",
          waitingHost: "تم إرسال الإجابة. في انتظار حكم المعلم…",
          correct: "✓ صحيح",
          wrong: "✗ خطأ",
          notJudged: "غير مطلوب",
          nobody: "لم يعرفها أحد.",
          answerWas: "الإجابة: {{answer}}"
        },
        judge: {
          heading: "احكم على الإجابة",
          expected: "الإجابة المتوقعة: {{answer}}",
          teamSaid: "أجاب {{team}}:",
          markCorrect: "✓ صحيح",
          markWrong: "✗ خطأ"
        },
        display: {
          correct: "صحيح",
          wrong: "خطأ"
        },
        end: {
          teamWins: "{{team}} يفوز باللوحة!",
          draw: "تعادل!",
          rematch: "إعادة المباراة",
          newGame: "لعبة جديدة",
          points: "النقاط"
        },
        notice: {
          connectError: "تعذّر الوصول إلى خادم اللعبة الآن. تحقق من اتصالك وأعد تحميل الصفحة."
        },
        err: {
          enterCode: "أدخل الرمز المكوّن من 4 أحرف."
        }
      },
      teamBuzzer: {
        title: "مواجهة الأضواء",
        eyebrow: "مسابقة جرس للصف",
        heroTitle: "مواجهة الأضواء",
        lede: "فريقان، سؤال واحد في كل مرة. اضغط الجرس أولاً بالإجابة الصحيحة لتسجيل النقطة.",
        role: {
          join: { title: "الانضمام إلى المواجهة", desc: "هل لديك رمز من معلمك؟ أدخله هنا واختر فريقك.", button: "الانضمام إلى المواجهة" },
          bigScreen: { title: "الشاشة الكبيرة", desc: "اعرض المسرح ولوحة النتائج على جهاز عرض ليراها الجميع.", button: "الشاشة الكبيرة" }
        },
        howto: "<b>كيف تُحسب النقاط:</b> يرى الفريقان نفس السؤال في نفس الوقت. الإجابة الصحيحة الأولى تفوز بالنقطة. الإجابة الخاطئة لا تكلّفك شيئاً، فاستمر في المحاولة حتى يجيب أحد أو ينتهي الوقت. يفوز بالمواجهة الفريق الذي يصل أولاً إلى <span class=\"mono\" id=\"howtoWinScore\">5</span> نقاط.",
        join: { label: "أدخل رمز الغرفة المكوّن من 4 أحرف", findRoom: "البحث عن الغرفة", roomLabel: "الغرفة", joinRed: "▲ الانضمام للأحمر", joinBlue: "◆ الانضمام للأزرق", watchBigScreen: "المشاهدة على الشاشة الكبيرة" },
        defaultTitle: "مواجهة الأضواء",
        lobby: { questionSingular: "{{n}} سؤال", questionPlural: "{{n}} أسئلة", redTeam: "الفريق الأحمر", blueTeam: "الفريق الأزرق", ready: "جاهز", waiting: "في الانتظار…", startShowdown: "بدء المواجهة", matchStarting: "المباراة تبدأ…", waitingBothTeams: "في انتظار كلا الفريقين…", leaveRoom: "مغادرة الغرفة" },
        match: {
          teamTagRed: "▲ الفريق الأحمر", teamTagBlue: "◆ الفريق الأزرق", typeYourAnswer: "اكتب إجابتك", buzz: "🔔 اضغط الجرس!", getReady: "استعد…",
          redBuzzedFirst: "▲ الفريق الأحمر ضغط الجرس أولاً!", blueBuzzedFirst: "◆ الفريق الأزرق ضغط الجرس أولاً!", timesUp: "⏱ انتهى الوقت. لم يُجب أحد.",
          watchingCaption: "تشاهد على الشاشة الكبيرة. الفرق تضغط الجرس من أجهزتها الخاصة.", scoreRedTag: "▲ أحمر", scoreBlueTag: "أزرق ◆"
        },
        display: { correct: "صحيح", wrong: "خطأ" },
        end: { redWins: "الفريق الأحمر يفوز بالمواجهة!", blueWins: "الفريق الأزرق يفوز بالمواجهة!", draw: "تعادل!", rematch: "مباراة أخرى", newShowdown: "مواجهة جديدة", points: "النقاط" },
        notice: { connectError: "تعذّر الوصول إلى خادم اللعبة الآن. تحقق من اتصالك وأعد تحميل الصفحة." },
        err: { enterCode: "أدخل الرمز المكوّن من 4 أحرف." }
      }
    }
  },

  pl: {
    common: {
      langLabel: "Język",
      backLabel: "Wstecz",
      copy: "Kopiuj kod",
      copied: "Skopiowano!",
      back: "← Wstecz"
    },
    errors: {
      roomNotFound: "Nie znaleziono gry z tym kodem.",
      invalidTeam: "Nieprawidłowa drużyna.",
      teamTaken: "Ta drużyna jest już zajęta.",
      noQuestions: "Dodaj co najmniej jedno prawidłowe pytanie.",
      badPasscode: "Nieprawidłowy kod nauczyciela.",
      passcodeNotConfigured: "Zapisane quizy są zablokowane, dopóki nie zostanie ustawiony kod nauczyciela strony.",
      notFound: "Ten element już nie istnieje.",
      gameStarted: "Ta gra już się rozpoczęła."
    },
    hub: {
      title: "Gry edukacyjne",
      nav: {
        home: "Start",
        play: "Graj",
        create: "Stwórz",
        notes: "Notatki z lekcji"
      },
      hero: {
        eyebrow: "Wielka ciekawość. Wspólne odkrywanie.",
        title1: "Ucz się na serio.",
        title2: "Graj razem.",
        lede: "Drużynowe gry na żywo w klasie i przejrzyste notatki z lekcji dla klas 4-12."
      },
      join: {
        eyebrow: "Dla uczniów",
        title: "Twoja klasa czeka.",
        desc: "Wpisz 4-literowy kod z ekranu w klasie.",
        label: "Kod pokoju",
        placeholder: "Kod pokoju",
        button: "Dołącz do gry",
        hint: "Bez zakładania konta. Po prostu wybierz drużynę."
      },
      sectionTitle: "Świetna lekcja zaczyna się tutaj.",
      sectionNote: "Bez pobierania. Bez kont.",
      card: {
        play: {
          eyebrow: "Dla uczniów · Graj",
          title: "Zagraj",
          desc: "Dołącz do trwającej gry albo wybierz zapisany quiz od nauczycieli i rozpocznij nowy mecz.",
          link: "Otwórz Graj"
        },
        create: {
          eyebrow: "Dla nauczycieli · Twórz",
          title: "Stwórz grę",
          desc: "Napisz własne pytania na dowolny temat albo rozpocznij szybki mecz Przeciągania liczb.",
          link: "Otwórz edytor"
        },
        courseNotes: {
          eyebrow: "Dla wszystkich · Ucz się",
          title: "Notatki z lekcji",
          desc: "Notatki z matematyki, fizyki i chemii z poprawnie złożonymi wzorami. Czytaj je wprost albo skorzystaj z zadania do gry.",
          link: "Przeglądaj notatki"
        }
      },
      spotlight: {
        eyebrow: "W centrum uwagi · Matematyka",
        title: "Rozwiązywanie równań kwadratowych.",
        desc: "Uzupełnianie do kwadratu i wzór kwadratowy.",
        link: "Przeczytaj lekcję"
      },
      footer: {
        left: "Gry edukacyjne · Stworzone z myślą o ciekawości w klasie.",
        right: "Uczmy się razem. Grajmy fair."
      }
    },
    play: {
      title: "Gry drużynowe",
      eyebrow: "Uczniowie i nauczyciele",
      heroTitle: "Grajmy razem.",
      lede: "Dołącz do otwartej gry albo rozpocznij nowy mecz z quizu zapisanego przez nauczycieli.",
      role: {
        join: { title: "Dołącz do gry", desc: "Masz kod od nauczyciela? Wpisz go tutaj i wybierz drużynę.", button: "Dołącz do gry" },
        bigScreen: { title: "Duży ekran", desc: "Wyświetl grę na projektorze, aby cała klasa mogła oglądać.", button: "Duży ekran" }
      },
      lookup: {
        back: "← Wstecz",
        label: "Wpisz 4-literowy kod pokoju",
        labelBigScreen: "Wpisz kod, aby wyświetlić go na dużym ekranie",
        placeholder: "----",
        button: "Znajdź pokój",
        errShort: "Wpisz 4-literowy kod.",
        errNotFound: "Nie znaleziono dopasowania dla tego kodu."
      },
      lobby: {
        heading: "Otwarte gry teraz",
        empty: "Obecnie nie ma otwartych gier.",
        join: "Dołącz",
        bigScreen: "Duży ekran",
        waiting: "Oczekuje",
        playing: "Trwa"
      },
      tabs: { active: "Aktywne gry", all: "Wszystkie gry" },
      library: {
        heading: "Zapisane gry nauczycieli",
        empty: "Nie ma jeszcze zapisanych gier.",
        unavailable: "Zapisane gry nie są teraz dostępne.",
        play: "Graj",
        launchFailed: "Nie udało się uruchomić gry. Spróbuj ponownie.",
        questionSingular: "{{n}} pytanie",
        questionPlural: "{{n}} pytań"
      },
      notice: {
        connectError: "Nie można teraz połączyć się z serwerem gry. Sprawdź połączenie i odśwież stronę."
      }
    },
    teacher: {
      lede: "Napisz własne pytania na dowolny temat, z notacją matematyczną i naukową, i otrzymaj kod, którym uczniowie dołączą z dowolnego urządzenia.",
      eyebrow: "Przestrzeń nauczyciela",
      setup: { heading: "Ustawienia gry" },
      field: { title: "Tytuł gry", titlePlaceholder: "np. Rozdział 6 - słownictwo", gameType: "Typ gry", theme: "Motyw" },
      mechanic: { race: "Wyścig", buzzer: "Brzęczyk", board: "Plansza" },
      addQuestion: "+ Dodaj pytanie",
      createRoom: "Utwórz pokój",
      done: {
        shareLabel: "Udostępnij ten kod swoim uczniom",
        lede: "Uczniowie wchodzą na {{link}}, wpisują powyższy kod, a następnie wybierają drużynę.",
        openStudentView: "Otwórz stronę dołączania dla ucznia",
        createAnother: "Stwórz kolejną grę",
        buzzerHint: "To gra z brzęczykiem. Otwórz link do dużego ekranu i wyświetl go dla całej klasy; drużyny naciskają brzęczyk na własnych urządzeniach.",
        boardHint: "To gra planszowa. Otwórz link do dużego ekranu i wyświetl go: prowadzący wybiera tam pola i ocenia odpowiedzi otwarte, a drużyny odpowiadają na własnych urządzeniach."
      },
      q: {
        remove: "Usuń pytanie",
        promptPlaceholder: "Treść pytania -- użyj przycisku paska narzędzi, aby wstawić wzór, albo wpisz $...$ samodzielnie",
        previewPlaceholder: "Podgląd pojawi się tutaj",
        shortAnswer: "Krótka odpowiedź",
        multipleChoice: "Wielokrotny wybór",
        correctAnswer: "Poprawna odpowiedź",
        correctAnswerPlaceholder: "np. Paryż, lub 42",
        choicesLabel: "Opcje (zaznacz poprawną)",
        addChoice: "+ Dodaj opcję",
        numbered: "Pytanie {{n}}",
        choiceTextPlaceholder: "Treść opcji",
        category: "Kategoria",
        categoryPlaceholder: "np. Ułamki",
        points: "Punkty",
        openAnswer: "Odpowiedź otwarta (ocenia nauczyciel)",
        expectedAnswer: "Oczekiwana odpowiedź"
      },
      themes: { rope: "Przeciąganie liny", rocket: "Wyścig rakiet", spotlight: "Pojedynek na scenie", classic: "Plansza quizowa" },
      templates: { fraction: "Ułamek", exponent: "Wykładnik", squareRoot: "Pierwiastek kwadratowy", chemistry: "Chemia" },
      err: {
        questionNeedsText: "Pytanie {{n}} wymaga treści.",
        questionNeedsChoices: "Pytanie {{n}} wymaga co najmniej 2 opcji.",
        questionNeedsCorrectChoice: "Pytanie {{n}}: zaznacz, która opcja jest poprawna.",
        questionNeedsAnswer: "Pytanie {{n}} wymaga poprawnej odpowiedzi.",
        questionNeedsCategory: "Pytanie {{n}} wymaga kategorii.",
        needOneQuestion: "Dodaj co najmniej jedno pełne pytanie.",
        createFailed: "Nie udało się utworzyć pokoju."
      },
      board: { penalty: "Błędne odpowiedzi odejmują punkty", timeLimit: "Czas na pytanie", seconds: "{{n}} s", teams: "Liczba drużyn", teamCount: "Drużyny: {{n}}" },
      choose: {
        heading: "Co chcesz stworzyć?",
        custom: { title: "Napisz własne pytania", desc: "Dowolny temat, tryb wyścigu lub brzęczyka, z notacją matematyczną i naukową." },
        numberHaul: { title: "Przeciąganie liczb", desc: "Szybkie matematyczne przeciąganie liny. Pytania generują się automatycznie, bez przygotowań." }
      },
      passcode: { label: "Kod nauczyciela", placeholder: "Wpisz kod nauczyciela", hint: "Potrzebny do wczytywania, zapisywania, edytowania i usuwania zapisanych quizów.", button: "Odblokuj", ok: "Odblokowano" },
      library: {
        saveButton: "Zapisz na później",
        saved: "Zapisano!",
        updateButton: "Zaktualizuj quiz",
        updated: "Zaktualizowano!",
        loadButton: "Wczytaj zapisany quiz",
        heading: "Zapisane quizy",
        empty: "Nie zapisano jeszcze żadnego quizu.",
        close: "Zamknij",
        load: "Wczytaj",
        delete: "Usuń",
        questionSingular: "{{n}} pytanie",
        questionPlural: "{{n}} pytań",
        unavailable: "Zapisane quizy nie są teraz dostępne."
      }
    },
    lessons: {
      brand: "Gry edukacyjne",
      nav: "Notatki z lekcji",
      pickSubject: "Wybierz przedmiot",
      empty: "Nie opublikowano jeszcze żadnych lekcji.",
      emptySubject: "Nie ma tu jeszcze żadnych lekcji.",
      notFoundTitle: "Nie znaleziono",
      notFoundBody: "Pod tym adresem nie ma jeszcze lekcji.",
      subjects: { math: "Matematyka", physics: "Fizyka", chemistry: "Chemia" },
      lede: "Jasne wyjaśnienia i rozwiązane przykłady z poprawnie złożonymi wzorami.",
      openSubject: "Otwórz notatki",
      read: "Czytaj",
      inThisNote: "W tej notatce",
      allNotes: "Wszystkie notatki",
      readTime: "{{n}} min czytania",
      play: {
        eyebrow: "Ucz się → Graj",
        title: "Wprowadź pomysł do gry.",
        desc: "Zamień tę notatkę w grę drużynową dla swojej klasy.",
        button: "Otwórz edytor"
      }
    },
    games: {
      tugOfWar: {
        title: "Przeciąganie liczb",
        eyebrow: "matematyczne przeciąganie liny",
        heroTitle: "Przeciąganie liczb",
        lede: "Dwie drużyny, dwa urządzenia, jedna lina. Rozwiązuj zadania szybko i poprawnie, aby przeciągnąć flagę za linię przed drugą stroną.",
        role: {
          create: { title: "Zacznij mecz", desc: "Wybierz poziom trudności, uzyskaj kod pokoju i zaproś drugą drużynę.", button: "Zacznij mecz" },
          join: { title: "Dołącz do meczu", desc: "Masz kod od nauczyciela lub drugiej drużyny? Wejdź tutaj.", button: "Dołącz do meczu" },
          bigScreen: { title: "Duży ekran", desc: "Wyświetl linę i wyniki na żywo na projektorze, aby wszyscy widzieli.", button: "Duży ekran" }
        },
        howto: "<b>Jak liczone są punkty:</b> poprawna odpowiedź przeciąga linę w twoją stronę: 10 punktów w czasie poniżej 5 sekund, 7 punktów między 5 a 10 sekund, 5 punktów później. Błędna odpowiedź nie daje punktów i kosztuje chwilę przed kolejnym pytaniem, więc szybkość opłaca się tylko wtedy, gdy odpowiedź jest też poprawna. Drużyna, która pierwsza przeciągnie flagę za swoją linię, wygrywa rundę.",
        create: { chooseDifficulty: "1. Wybierz poziom trudności", pickTeam: "2. Wybierz swoją drużynę", redTeam: "▲ Czerwona drużyna", blueTeam: "◆ Niebieska drużyna", createRoom: "Utwórz pokój" },
        join: { label: "Wpisz 4-literowy kod pokoju", findRoom: "Znajdź pokój", roomLabel: "Pokój", joinRed: "▲ Dołącz do Czerwonych", joinBlue: "◆ Dołącz do Niebieskich", watchBigScreen: "Oglądaj na dużym ekranie" },
        lobby: { difficulty: "Poziom trudności: {{tier}}", redTeam: "Czerwona drużyna", blueTeam: "Niebieska drużyna", ready: "Gotowa", waiting: "Czeka…", startMatch: "Zacznij mecz", matchStarting: "Mecz się zaczyna…", waitingBothTeams: "Czekanie na obie drużyny…", leaveRoom: "Opuść pokój" },
        match: { redTag: "▲ CZERWONI", blueTag: "NIEBIESCY ◆", teamTagRed: "▲ CZERWONA DRUŻYNA", teamTagBlue: "◆ NIEBIESKA DRUŻYNA", streak: "Seria {{n}}", accuracy: "Skuteczność {{value}}", haul: "Ciągnij ✓" },
        display: { correct: "Poprawne", wrong: "Błędy", accuracy: "Skuteczność" },
        end: { redWins: "Czerwona drużyna wygrywa rundę!", blueWins: "Niebieska drużyna wygrywa rundę!", draw: "Remis!", rematch: "Rewanż", newMatch: "Nowy mecz" },
        notice: { connectError: "Nie można teraz połączyć się z serwerem gry. Sprawdź połączenie i odśwież stronę." },
        err: { createFailed: "Nie udało się utworzyć pokoju.", enterCode: "Wpisz 4-literowy kod." },
        tiers: {
          rookie: { label: "Nowicjusz", blurb: "Dodawanie i odejmowanie, liczby do 20" },
          varsity: { label: "Zawodnik", blurb: "+ − × ÷ i ułamki, większe liczby" },
          champion: { label: "Mistrz", blurb: "Liczby ujemne, kolejność działań, potęgi" }
        }
      },
      teamRace: {
        title: "Wyścig drużyn",
        eyebrow: "wyścig drużyn klasowych",
        heroTitle: "Wyścig drużyn",
        lede: "Dwie lub cztery drużyny, jeden wyścig. Odpowiadaj na pytania nauczyciela szybko i poprawnie, aby wyprzedzić pozostałe drużyny.",
        role: {
          join: { title: "Dołącz do wyścigu", desc: "Masz kod od nauczyciela? Wpisz go tutaj i wybierz drużynę.", button: "Dołącz do wyścigu" },
          bigScreen: { title: "Duży ekran", desc: "Wyświetl wyścig i wyniki na żywo na projektorze, aby wszyscy widzieli.", button: "Duży ekran" }
        },
        howto: "<b>Jak liczone są punkty:</b> poprawna odpowiedź przesuwa znacznik w twoją stronę, więcej za szybką odpowiedź, mniej za wolną. Błędna odpowiedź nie daje punktów i kosztuje chwilę przed kolejnym pytaniem. Drużyna, która pierwsza przesunie znacznik na swoją stronę, wygrywa wyścig.",
        join: { label: "Wpisz 4-literowy kod pokoju", findRoom: "Znajdź pokój", roomLabel: "Pokój", joinTeam: "Dołącz: {{team}}", watchBigScreen: "Oglądaj na dużym ekranie" },
        teams: { A: "Czerwona drużyna", B: "Niebieska drużyna", C: "Zielona drużyna", D: "Fioletowa drużyna" },
        defaultTitle: "Wyścig drużyn",
        lobby: { questionSingular: "{{n}} pytanie", questionPlural: "{{n}} pytań", ready: "Gotowa", waiting: "Czeka…", startRace: "Zacznij wyścig", startRaceTeams: "Zacznij wyścig (drużyny: {{n}})", needTwoTeams: "Czekanie na co najmniej 2 drużyny…", matchStarting: "Mecz się zaczyna…", waitingBothTeams: "Czekanie na obie drużyny…", leaveRoom: "Opuść pokój" },
        match: { timeLeft: "Pozostały czas", redTag: "▲ CZERWONI", blueTag: "NIEBIESCY ◆", streak: "Seria {{n}}", accuracy: "Skuteczność {{value}}", typeYourAnswer: "Wpisz odpowiedź", submit: "Wyślij" },
        display: { correct: "Poprawne", wrong: "Błędy", accuracy: "Skuteczność" },
        end: { champions: "Dzisiejsi mistrzowie", leaderboard: "Ranking końcowy", noWinner: "Tym razem bez zwycięzcy.", teamWins: "{{team}} wygrywa wyścig!", draw: "Remis!", rematch: "Rewanż", newRace: "Nowy wyścig" },
        notice: { connectError: "Nie można teraz połączyć się z serwerem gry. Sprawdź połączenie i odśwież stronę." },
        err: { enterCode: "Wpisz 4-literowy kod." }
      },
      teamBoard: {
        title: "Plansza quizowa",
        eyebrow: "klasowa plansza quizowa",
        heroTitle: "Plansza quizowa",
        lede: "Od dwóch do czterech drużyn, jedna plansza. Wybierz pole, odpowiedz na swoim urządzeniu i zdobądź jego punkty.",
        role: {
          join: {
            title: "Dołącz do gry planszowej",
            desc: "Masz kod od nauczyciela? Wpisz go tutaj i wybierz drużynę.",
            button: "Dołącz do gry planszowej"
          },
          bigScreen: {
            title: "Duży ekran",
            desc: "Wyświetl planszę na projektorze. Prowadzący wybiera tu pola i ocenia odpowiedzi otwarte.",
            button: "Duży ekran"
          }
        },
        howto: "<b>Jak to działa:</b> może dołączyć do 4 drużyn. Drużyna, która ma ruch, wybiera pole, a każda drużyna ma jedną odpowiedź. Pierwsza poprawna odpowiedź zdobywa punkty pola i ruch na planszy. Gdy wszystkie pola zostaną zagrane, wygrywa najwyższy wynik.",
        join: {
          joinTeam: "Dołącz: {{team}}",
          label: "Wpisz 4-literowy kod pokoju",
          findRoom: "Znajdź pokój",
          roomLabel: "Pokój",
          watchBigScreen: "Oglądaj na dużym ekranie"
        },
        teams: {
          A: "Czerwona drużyna",
          B: "Niebieska drużyna",
          C: "Zielona drużyna",
          D: "Fioletowa drużyna"
        },
        defaultTitle: "Plansza quizowa",
        lobby: {
          open: "Wolne miejsce",
          needTwoTeams: "Czekanie na co najmniej 2 drużyny…",
          timeLimit: "{{n}} sekund na pytanie.",
          questionSingular: "{{n}} pole",
          questionPlural: "{{n}} pól",
          ready: "Gotowa",
          startGame: "Zacznij grę (drużyny: {{n}})",
          matchStarting: "Gra się zaczyna…",
          leaveRoom: "Opuść pokój",
          penaltyOn: "W tej grze błędna odpowiedź odejmuje punkty pola.",
          penaltyOff: "W tej grze błędna odpowiedź nic nie kosztuje."
        },
        match: {
          teamPicks: "Wybiera: {{team}}",
          teamWins: "{{team}} zdobywa {{points}} punktów!",
          typeYourAnswer: "Wpisz odpowiedź",
          submit: "Wyślij",
          getReady: "Przygotuj się…",
          yourPick: "Twoja drużyna wybiera pole.",
          waitPick: "Czekanie na wybór drużyny, która ma ruch…",
          hostPickHint: "Kliknij pole, aby wybrać je za drużynę, która ma ruch.",
          notAnswered: "Brak odpowiedzi",
          answered: "Odpowiedź wysłana",
          judging: "Czekanie na nauczyciela…",
          waitingHost: "Odpowiedź wysłana. Czekanie na ocenę nauczyciela…",
          correct: "✓ Dobrze",
          wrong: "✗ Źle",
          notJudged: "Niepotrzebne",
          nobody: "Nikt nie odgadł.",
          answerWas: "Odpowiedź: {{answer}}"
        },
        judge: {
          heading: "Oceń odpowiedź",
          expected: "Oczekiwana odpowiedź: {{answer}}",
          teamSaid: "{{team}} odpowiada:",
          markCorrect: "✓ Dobrze",
          markWrong: "✗ Źle"
        },
        display: {
          correct: "Dobrze",
          wrong: "Źle"
        },
        end: {
          teamWins: "{{team}} wygrywa planszę!",
          draw: "Remis!",
          rematch: "Rewanż",
          newGame: "Nowa gra",
          points: "Punkty"
        },
        notice: {
          connectError: "Nie można teraz połączyć się z serwerem gry. Sprawdź połączenie i odśwież stronę."
        },
        err: {
          enterCode: "Wpisz 4-literowy kod."
        }
      },
      teamBuzzer: {
        title: "Pojedynek na scenie",
        eyebrow: "quiz z brzęczykiem dla klasy",
        heroTitle: "Pojedynek na scenie",
        lede: "Dwie drużyny, jedno pytanie na raz. Naciśnij brzęczyk pierwszy z poprawną odpowiedzią, aby zdobyć punkt.",
        role: {
          join: { title: "Dołącz do pojedynku", desc: "Masz kod od nauczyciela? Wpisz go tutaj i wybierz drużynę.", button: "Dołącz do pojedynku" },
          bigScreen: { title: "Duży ekran", desc: "Wyświetl scenę i tablicę wyników na projektorze, aby wszyscy widzieli.", button: "Duży ekran" }
        },
        howto: "<b>Jak liczone są punkty:</b> obie drużyny widzą to samo pytanie w tym samym czasie. Pierwsza poprawna odpowiedź zdobywa punkt. Błędna odpowiedź nic nie kosztuje, więc próbuj dalej, aż ktoś odpowie poprawnie albo czas się skończy. Drużyna, która pierwsza zdobędzie <span class=\"mono\" id=\"howtoWinScore\">5</span> punktów, wygrywa pojedynek.",
        join: { label: "Wpisz 4-literowy kod pokoju", findRoom: "Znajdź pokój", roomLabel: "Pokój", joinRed: "▲ Dołącz do Czerwonych", joinBlue: "◆ Dołącz do Niebieskich", watchBigScreen: "Oglądaj na dużym ekranie" },
        defaultTitle: "Pojedynek na scenie",
        lobby: { questionSingular: "{{n}} pytanie", questionPlural: "{{n}} pytań", redTeam: "Czerwona drużyna", blueTeam: "Niebieska drużyna", ready: "Gotowa", waiting: "Czeka…", startShowdown: "Zacznij pojedynek", matchStarting: "Mecz się zaczyna…", waitingBothTeams: "Czekanie na obie drużyny…", leaveRoom: "Opuść pokój" },
        match: {
          teamTagRed: "▲ CZERWONA DRUŻYNA", teamTagBlue: "◆ NIEBIESKA DRUŻYNA", typeYourAnswer: "Wpisz odpowiedź", buzz: "🔔 Brzęczyk!", getReady: "Przygotuj się…",
          redBuzzedFirst: "▲ Czerwona drużyna nacisnęła brzęczyk pierwsza!", blueBuzzedFirst: "◆ Niebieska drużyna nacisnęła brzęczyk pierwsza!", timesUp: "⏱ Czas minął. Nikt nie odpowiedział.",
          watchingCaption: "Oglądasz na dużym ekranie. Drużyny naciskają brzęczyk na własnych urządzeniach.", scoreRedTag: "▲ CZERWONI", scoreBlueTag: "NIEBIESCY ◆"
        },
        display: { correct: "Poprawne", wrong: "Błędy" },
        end: { redWins: "Czerwona drużyna wygrywa pojedynek!", blueWins: "Niebieska drużyna wygrywa pojedynek!", draw: "Remis!", rematch: "Rewanż", newShowdown: "Nowy pojedynek", points: "Punkty" },
        notice: { connectError: "Nie można teraz połączyć się z serwerem gry. Sprawdź połączenie i odśwież stronę." },
        err: { enterCode: "Wpisz 4-literowy kod." }
      }
    }
  }
};
