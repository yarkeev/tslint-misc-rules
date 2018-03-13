import * as Lint from 'tslint/lib'
import * as ts from 'typescript'
import { getClassMethods } from '../helpers/getClassMethods'
import { getLeadingWhitespace } from '../helpers/getLeadingWhitespace'
import { nodeIsKind } from '../helpers/nodeIsKind'

export class Rule extends Lint.Rules.AbstractRule {
	public apply(sourceFile: ts.SourceFile) {
		return this.applyWithFunction(sourceFile, walk.bind(null, this.getOptions()))
	}
}

function walk(options: any, ctx: Lint.WalkContext<void>) {
	ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
		if (nodeIsKind(node, 'ClassDeclaration') || nodeIsKind(node, 'ClassExpression')) {
			checkClass(options, ctx, node as ts.ClassLikeDeclaration)
		}
		return ts.forEachChild(node, cb)
	})
}

function checkClass(options, ctx: Lint.WalkContext<void>, node: ts.ClassLikeDeclaration) {
	const sf = ctx.sourceFile
	const methods = getClassMethods(node)
	const isPaddedClasses =
		options &&
		options.ruleArguments.filter(item => item['padded-classes'] === true).length > 0

	methods.reduce((previousMethod, method) => {
		const leadingWhitespace = getLeadingWhitespace(method)
		const newlineCount = leadingWhitespace.match(/\n/g).length
		const hasComments = /\/\/|\/\*\*/g.test(leadingWhitespace)
		const isFirstMethod = method === node.members[0]
		const isInOverloadGroup =
			method !== previousMethod &&
			method.name.getText(sf) === previousMethod.name.getText(sf)
		const expectedNewlines =
			(isFirstMethod && !isPaddedClasses) || isInOverloadGroup ? 1 : 2

		if (
			newlineCount < expectedNewlines ||
			(newlineCount > expectedNewlines && !hasComments)
		) {
			const newLine = leadingWhitespace.match('\r\n') ? '\r\n' : '\n'
			ctx.addFailureAtNode(
				method.name,
				'class methods should be preceded by an empty line',
				Lint.Replacement.appendText(
					method.getStart(sf) - leadingWhitespace.length,
					newLine
				)
			)
		}

		return method
	}, methods[0])
}
