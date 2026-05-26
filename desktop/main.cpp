#include <QApplication>
#include <QWidget>
#include <QPainter>
#include <QStackedLayout>
#include <QVBoxLayout>
#include <QLabel>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QShortcut>
#include <QFontMetricsF>
#include <QMetaObject>

#include <algorithm>

#include "rsvp_engine.hpp"

class ReaderWidget : public QWidget {
public:
    explicit ReaderWidget(QWidget* parent = nullptr) : QWidget(parent) {
        setAttribute(Qt::WA_StyledBackground, true);
    }

    void setToken(const QString& before, const QString& orp,
                  const QString& after, const QString& punct) {
        before_ = before;
        orp_ = orp;
        after_ = after;
        punct_ = punct;
        update();
    }

    void setWpm(int wpm) {
        wpm_ = wpm;
        update();
    }

    void setProgress(int idx, int total) {
        cur_idx_ = idx;
        total_ = total;
        update();
    }

protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        p.fillRect(rect(), QColor(10, 10, 10));
        p.setRenderHint(QPainter::Antialiasing, true);

        const int midX = width() / 2;
        const int midY = height() / 2;

        QPen guide(QColor(255, 255, 255, 15));
        guide.setWidth(1);
        p.setPen(guide);
        p.drawLine(0, midY, width(), midY);
        p.drawLine(midX, 0, midX, height());

        QFont wordFont("EB Garamond", 48);
        wordFont.setStyleHint(QFont::Serif);
        QFont orpFont = wordFont;
        orpFont.setBold(true);

        QFontMetricsF baseFm(wordFont);
        QFontMetricsF orpFm(orpFont);
        const double orpWidth = orpFm.horizontalAdvance(orp_);
        const double beforeWidth = baseFm.horizontalAdvance(before_);
        const double afterWidth = baseFm.horizontalAdvance(after_);

        const double baseline = (height() + baseFm.ascent() - baseFm.descent()) / 2.0;
        const double orpX = midX - orpWidth / 2.0;

        p.setFont(wordFont);
        p.setPen(QColor(232, 228, 220));
        p.drawText(QPointF(orpX - beforeWidth, baseline), before_);

        p.setFont(orpFont);
        p.setPen(QColor(192, 57, 43));
        p.drawText(QPointF(orpX, baseline), orp_);

        p.setFont(wordFont);
        p.setPen(QColor(232, 228, 220));
        p.drawText(QPointF(orpX + orpWidth, baseline), after_);

        p.setPen(QColor(255, 255, 255, 102));
        p.drawText(QPointF(orpX + orpWidth + afterWidth, baseline), punct_);

        QFont badgeFont("Monospace", 12);
        badgeFont.setStyleHint(QFont::Monospace);
        p.setFont(badgeFont);
        p.setPen(QColor(255, 255, 255, 56));

        const QString wpmText = QString("%1 WPM").arg(wpm_);
        QFontMetricsF badgeFm(badgeFont);
        const int margin = 16;
        p.drawText(QPointF(width() - margin - badgeFm.horizontalAdvance(wpmText),
                           height() - margin),
                   wpmText);

        const int displayIdx = total_ > 0 ? std::min(cur_idx_ + 1, total_) : 0;
        const QString progressText = QString("%1/%2").arg(displayIdx).arg(total_);
        p.drawText(QPointF(margin, height() - margin), progressText);
    }

private:
    QString before_;
    QString orp_;
    QString after_;
    QString punct_;
    int wpm_ = 300;
    int cur_idx_ = 0;
    int total_ = 0;
};

class MainWindow : public QWidget {
    Q_OBJECT
public:
    MainWindow() {
        setWindowTitle("RSVP Speed Reader");
        resize(900, 600);

        stack_ = new QStackedLayout(this);
        setupInputPage();
        setupReaderPage();
        stack_->setCurrentIndex(0);

        setupShortcuts();
        wireEngineCallbacks();

        setStyleSheet(
            "QWidget { background: #0a0a0a; color: #e8e4dc; }"
            "QPlainTextEdit { background: #111111; color: #e8e4dc; }"
            "QPushButton { background: #c0392b; color: #e8e4dc; padding: 8px 16px; border: none; }"
        );
    }

private:
    void setupInputPage() {
        auto* page = new QWidget(this);
        auto* layout = new QVBoxLayout(page);
        layout->setContentsMargins(40, 40, 40, 40);
        layout->setSpacing(16);

        auto* label = new QLabel("Paste or type your text, then click START", page);
        QFont mono;
        mono.setStyleHint(QFont::Monospace);
        label->setFont(mono);
        label->setStyleSheet("color: rgba(255,255,255,0.22);");

        input_ = new QPlainTextEdit(page);
        input_->setPlaceholderText("Paste text here...");

        start_ = new QPushButton("START", page);
        connect(start_, &QPushButton::clicked, this, [this]() { startReading(); });

        layout->addWidget(label);
        layout->addWidget(input_, 1);
        layout->addWidget(start_, 0, Qt::AlignLeft);

        stack_->addWidget(page);
    }

    void setupReaderPage() {
        auto* page = new QWidget(this);
        auto* layout = new QVBoxLayout(page);
        layout->setContentsMargins(0, 0, 0, 0);
        reader_ = new ReaderWidget(page);
        layout->addWidget(reader_);
        stack_->addWidget(page);
    }

    void setupShortcuts() {
        auto* space = new QShortcut(QKeySequence(Qt::Key_Space), this);
        connect(space, &QShortcut::activated, this, [this]() {
            if (stack_->currentIndex() == 1) engine_.toggle();
        });

        auto* left = new QShortcut(QKeySequence(Qt::Key_Left), this);
        connect(left, &QShortcut::activated, this, [this]() {
            if (stack_->currentIndex() == 1) engine_.seek(-8);
        });

        auto* right = new QShortcut(QKeySequence(Qt::Key_Right), this);
        connect(right, &QShortcut::activated, this, [this]() {
            if (stack_->currentIndex() == 1) engine_.seek(8);
        });

        auto* up = new QShortcut(QKeySequence(Qt::Key_Up), this);
        connect(up, &QShortcut::activated, this, [this]() {
            if (stack_->currentIndex() != 1) return;
            wpm_ = std::min(wpm_ + 25, 1200);
            engine_.set_wpm(wpm_);
            reader_->setWpm(wpm_);
        });

        auto* down = new QShortcut(QKeySequence(Qt::Key_Down), this);
        connect(down, &QShortcut::activated, this, [this]() {
            if (stack_->currentIndex() != 1) return;
            wpm_ = std::max(wpm_ - 25, 60);
            engine_.set_wpm(wpm_);
            reader_->setWpm(wpm_);
        });

        auto* esc = new QShortcut(QKeySequence(Qt::Key_Escape), this);
        connect(esc, &QShortcut::activated, this, [this]() { backToInput(); });
    }

    void wireEngineCallbacks() {
        engine_.on_token = [this](const rsvp::Token& t, size_t idx, size_t total) {
            const QString before = QString::fromStdString(t.before);
            const QString orp = QString::fromStdString(t.orp);
            const QString after = QString::fromStdString(t.after);
            const QString punct = QString::fromStdString(t.punct);

            QMetaObject::invokeMethod(
                this,
                [this, before, orp, after, punct, idx, total]() {
                    reader_->setToken(before, orp, after, punct);
                    reader_->setProgress((int)idx, (int)total);
                },
                Qt::QueuedConnection
            );
        };

        engine_.on_state = [this](rsvp::State) {
            QMetaObject::invokeMethod(this, [this]() { }, Qt::QueuedConnection);
        };

        engine_.on_done = [this]() {
            QMetaObject::invokeMethod(this, [this]() { }, Qt::QueuedConnection);
        };
    }

    void startReading() {
        const QString text = input_->toPlainText();
        engine_.load(text.toStdString(), wpm_);
        reader_->setWpm(wpm_);
        stack_->setCurrentIndex(1);
        engine_.play();
    }

    void backToInput() {
        engine_.pause();
        stack_->setCurrentIndex(0);
    }

    QStackedLayout* stack_ = nullptr;
    QPlainTextEdit* input_ = nullptr;
    QPushButton* start_ = nullptr;
    ReaderWidget* reader_ = nullptr;
    rsvp::Engine engine_;
    int wpm_ = 300;
};

int main(int argc, char** argv) {
    QApplication app(argc, argv);
    MainWindow w;
    w.show();
    return app.exec();
}

#include "main.moc"
