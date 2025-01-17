const {
    timeParse
} = require('d3-time-format')

const {
    COMMITTEES,
    startOfToday,
} = require('../config.js')

const actionsThatCanBeFuture = [
    'Scheduled for Executive Action', 
    'Hearing', 'Scheduled for 2nd Reading',
    'Scheduled for 3rd Reading',
    'Fiscal Note Requested' // really?
]

class Overview {
    constructor({ bills, votes, annotations }) {
        this.data = {
            updateTime: new Date(),
            summary: this.calculateSummaryStats(bills, votes),
            mostRecentActionDate: this.mostRecentActionDate(bills),
            about: annotations.about,
            participation: annotations.participation,
            contactUs: annotations.contactUs,
            infoPopups: annotations.infoPopups,
            hearings: this.getHearingsScheduled(bills),
            floorActions: this.getFloorActionsScheduled(bills),
        }
    }

    calculateSummaryStats = (bills, votes) => {
        // status tests
        const introduced = d => d.data.progress.toFirstChamber
        const pastFirstChamber = d => d.data.progress.firstChamberStatus === 'passed'
        const pastSecondChamber = d => d.data.progress.secondChamberStatus === 'passed'
        const toGovernor = d => d.data.progress.toGovernor
        const signedByGovernor = d => d.data.progress.governorStatus === 'signed'
        const vetoedByGovernor = d => d.data.progress.governorStatus === 'vetoed'
        const enactedWithNoGovernorSignature = d => d.data.progress.governorStatus === 'became law unsigned'
        const becameLaw = d => d.data.progress.finalOutcome === 'passed'

        const actualBills = bills
            .filter(d => d.type === 'bill')
        const senateBills = actualBills.filter(d => d.data.identifier[0] === 'S')
        const houseBills = actualBills.filter(d => d.data.identifier[0] === 'H')
        const resolutions = bills.filter(d => ['resolution', 'joint resolution', 'referendum proposal'].includes(d.type))

        console.log("Bill stats")
        console.table([
            { key: 'bills', value: actualBills.length },
            { key: '-- house bills', value: houseBills.length },
            { key: '-- senate bills', value: senateBills.length },
            { key: 'resolutions', value: bills.filter(d => d.type === 'resolution').length },
            { key: 'joint resolutions', value: bills.filter(d => d.type === 'joint resolution').length },
            { key: 'referendum proposals', value: bills.filter(d => d.type === 'referendum proposal').length },
        ])

        const summary = {
            numBillsAndResolutions: bills.length,
            senateBills: {
                total: senateBills.length,
                introduced: senateBills.filter(introduced).length,
                pastFirstChamber: senateBills.filter(pastFirstChamber).length,
                pastSecondChamber: senateBills.filter(pastSecondChamber).length,
                toGovernor: senateBills.filter(toGovernor).length,
                pastGovernor: senateBills.filter(signedByGovernor).length + senateBills.filter(enactedWithNoGovernorSignature).length,
            },
            houseBills: {
                total: houseBills.length,
                introduced: houseBills.filter(introduced).length,
                pastFirstChamber: houseBills.filter(pastFirstChamber).length,
                pastSecondChamber: houseBills.filter(pastSecondChamber).length,
                toGovernor: houseBills.filter(toGovernor).length,
                pastGovernor: houseBills.filter(signedByGovernor).length + houseBills.filter(enactedWithNoGovernorSignature).length,
            },
            resolutions: {
                total: resolutions.length,
                introduced: resolutions.filter(introduced).length,
                passed: resolutions.filter(becameLaw).length,
            }


        }
        return summary
    }

    mostRecentActionDate = bills => {
        const actions = bills.map(d => d.actions).flat()
            .filter(d => !actionsThatCanBeFuture.includes(d.description)) // excludes future actions, hopefully
            .filter(d => new Date(d.date) < new Date()) // explicitly exclude other future actions (as data entry errors)
        const mostRecent = actions.reduce((prev, current) => new Date(prev.date) > new Date(current.date) ? prev : current)
        // console.log(mostRecent)
        return timeParse('%Y-%m-%d')(mostRecent.date)
    }

    getHearingsScheduled = bills => {
        const hearings = bills.map(bill => {
            const upcomingBillHearings = bill.actions
                .filter(d => d.description === 'Hearing')
                .filter(d => new Date(d.date) >= startOfToday)

            return upcomingBillHearings.map(action => {
                const committeeMatch = COMMITTEES.find(d => d.name === action.committee)
                if (!committeeMatch) throw `Missing committee match, ${action.committee}`
                return {
                    ...action,
                    committee: committeeMatch,
                    bill: [bill].map(d => ({
                        // hacky
                        key: d.data.key,
                        identifier: d.data.identifier,
                        title: d.data.title,
                        label: d.data.label,
                        type: d.type,
                        status: d.data.status,
                        sponsor: d.data.sponsor,
                        label: d.data.label,
                        textUrl: d.data.textUrl,
                        fiscalNoteUrl: d.data.fiscalNoteUrl,
                        legalNoteUrl: d.data.legalNoteUrl,
                        numArticles: d.data.numArticles,
                        sponsor: d.data.sponsor,
                    }))[0],
                }
            })
        }).flat()
        // const upcomingDates = Array.from(new Set(hearings.map(d => d.date)))
        // const committees = Array.from(new Set(hearings.map(d => d.committee)))


        return hearings
    }

    getFloorActionsScheduled = bills => {
        const floorActions = bills.map(bill => {
            const upcomingFloorActions = bill.actions
                .filter(d => ['Scheduled for 2nd Reading', 'Scheduled for 3rd Reading'].includes(d.description))
                .filter(d => new Date(d.date) >= startOfToday)

            return upcomingFloorActions.map(action => {
                return {
                    ...action,
                    bill: [bill].map(d => ({
                        // hacky
                        key: d.data.key,
                        identifier: d.data.identifier,
                        title: d.data.title,
                        label: d.data.label,
                        type: d.type,
                        status: d.data.status,
                        sponsor: d.data.sponsor,
                        label: d.data.label,
                        textUrl: d.data.textUrl,
                        fiscalNoteUrl: d.data.fiscalNoteUrl,
                        legalNoteUrl: d.data.legalNoteUrl,
                        numArticles: d.data.numArticles,
                        sponsor: d.data.sponsor,
                    }))[0],
                }
            })
        }).flat()
        return floorActions
    }

    export = () => ({ ...this.data })

}

module.exports = Overview